import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const AREAS = ["Todas","Auren Prime","Auren Scale","Auren Brigada Ads","Acelera TikTok","Auren Performance","Auren Performance Plus","Auren ONE","Auren Start","Auren X","Auren E-Commerce","Auren Brigada Meli","Auren Minha Pagina"];
const AREAS_FILTRO = ["Todas","Auren Prime","Auren Scale","Auren Brigada Ads","Acelera TikTok","Auren Performance","Auren ONE","Auren Start","Auren X","Auren E-Commerce"];
const COR_AREA = {"Auren Prime":"#8b5cf6","Auren Scale":"#3b82f6","Auren Brigada Ads":"#f59e0b","Acelera TikTok":"#ef4444","Auren Performance":"#06b6d4","Auren Performance Plus":"#0284c7","Auren ONE":"#10b981","Auren Start":"#84cc16","Auren X":"#f97316","Auren E-Commerce":"#ec4899","Auren Brigada Meli":"#eab308","Auren Minha Pagina":"#6366f1"};
const TIPO_CONSULTOR = {interno:{label:"Interno",color:"#3b82f6",icon:"🏢"},licenciado:{label:"Licenciado",color:"#8b5cf6",icon:"🤝"}};
const STATUS_ENTREGA = {pendente:{label:"Pendente",color:"#94a3b8"},em_andamento:{label:"Em Andamento",color:"#3b82f6"},aguardando_validacao:{label:"Aguard. Validação",color:"#8b5cf6"},aprovado:{label:"Aprovado",color:"#10b981"},atrasado:{label:"Atrasado",color:"#ef4444"},concluido:{label:"Concluído",color:"#6b7280"}};
const FLUXO = [{id:"plano_24h",label:"Plano 24h",prazo:"24h"},{id:"validacao",label:"Validação/Feedback",prazo:null},{id:"envio_cliente",label:"Envio ao Cliente",prazo:null},{id:"plano_6m",label:"Plano 6 Meses",prazo:null},{id:"zoho",label:"Criação no Zoho",prazo:"3 dias"},{id:"acompanhamento",label:"Acompanhamento",prazo:null}];
const ALERTAS_TIPOS = {atraso:{label:"Atraso na Entrega",icon:"⏰",color:"#ef4444"},noshow:{label:"No-Show Recorrente",icon:"❌",color:"#f97316"},renovacao:{label:"Entrando em Renovação",icon:"🔄",color:"#8b5cf6"},tecnico_pendente:{label:"Técnico Pendente",icon:"🔧",color:"#f59e0b"},sem_reuniao:{label:"Sem Reunião",icon:"📵",color:"#64748b"},reclamacao:{label:"Reclamação",icon:"🚨",color:"#dc2626"},zoho_desatualizado:{label:"Zoho Desatualizado",icon:"🗂",color:"#0ea5e9"}};
const TROFEUS = [{nivel:"Topázio",min:12500,max:50000,cor:"#a78bfa",emoji:"🔷",bg:"#f5f3ff"},{nivel:"Citrino",min:50000,max:100000,cor:"#fbbf24",emoji:"🟡",bg:"#fffbeb"},{nivel:"Safira",min:100000,max:300000,cor:"#3b82f6",emoji:"💎",bg:"#eff6ff"},{nivel:"Esmeralda",min:300000,max:500000,cor:"#10b981",emoji:"💚",bg:"#f0fdf4"},{nivel:"Rubi",min:500000,max:1000000,cor:"#ef4444",emoji:"❤️",bg:"#fef2f2"},{nivel:"Diamante",min:1000000,max:1500000,cor:"#06b6d4",emoji:"💠",bg:"#ecfeff"},{nivel:"Diamante Platinum",min:1500000,max:2000000,cor:"#8b5cf6",emoji:"🌟",bg:"#faf5ff"},{nivel:"Diamante Master",min:2000000,max:5000000,cor:"#f97316",emoji:"🔥",bg:"#fff7ed"},{nivel:"Moussaieff",min:5000000,max:10000000,cor:"#ec4899",emoji:"🌸",bg:"#fdf2f8"},{nivel:"Pink Star",min:10000000,max:Infinity,cor:"#db2777",emoji:"⭐",bg:"#fce7f3"}];

const getTrofeu = fat => TROFEUS.find(t=>fat>=t.min&&fat<t.max)||(fat>=10000000?TROFEUS[9]:null);
const getProximo = fat => { const i=TROFEUS.findIndex(t=>fat>=t.min&&fat<t.max); return i>=0&&i<TROFEUS.length-1?TROFEUS[i+1]:null; };
const fmtBRL = v => v>=1000000?"R$ "+(v/1000000).toFixed(1)+"M":v>=1000?"R$ "+(v/1000).toFixed(0)+"k":"R$ "+v;
const pct = (r,t) => t===0?0:Math.round((r/t)*100);
const progCliente = c => Math.round((Object.values(c.status_etapas||{}).filter(s=>s==="concluido"||s==="aprovado").length/6)*100);
const AUTORES = {cliente:["Você","Assistente","HEAD"],time:["Você","HEAD"],demanda:["Você","Assistente"]};
const AUTOR_COR = {"Você":"#3b82f6","Assistente":"#8b5cf6","HEAD":"#f59e0b"};
const AUTOR_ICON = {"Você":"👤","Assistente":"🤝","HEAD":"⭐"};

// ─── DADOS INICIAIS (carregados uma vez no Firebase se ainda não existirem) ──

const CLIENTES_INICIAIS = [
  {empresa:"Cabide Infantil",consultor:"Aguinaldo",area:"Auren Prime",start:"2025-01-05",mes_atual:5,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"concluido",plano_6m:"em_andamento",zoho:"concluido",acompanhamento:"em_andamento"},reunioes_realizadas:15,reunioes_total:18,tecnicos_mes:1,alertas:["renovacao"],status_renovacao:"renovacao",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-16",comentarios:[{autor:"Assistente",texto:"Cliente pediu reunião extra para semana que vem.",data:"22/05/2025"}]},
  {empresa:"Bazzo Outlet",consultor:"Vinicius",area:"Auren Prime",start:"2025-01-05",mes_atual:3,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"em_andamento",plano_6m:"pendente",zoho:"concluido",acompanhamento:"em_andamento"},reunioes_realizadas:12,reunioes_total:18,tecnicos_mes:0,alertas:["tecnico_pendente","zoho_desatualizado"],status_renovacao:"ativo",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-10",comentarios:[]},
  {empresa:"SnackBox",consultor:"Beatriz",area:"Auren Scale",start:"2025-01-06",mes_atual:2,status_etapas:{plano_24h:"concluido",validacao:"aguardando_validacao",envio_cliente:"pendente",plano_6m:"pendente",zoho:"atrasado",acompanhamento:"em_andamento"},reunioes_realizadas:4,reunioes_total:8,tecnicos_mes:0,alertas:["atraso","noshow"],status_renovacao:"ativo",reclamacoes:1,zoho_ultima_atualizacao:"2025-05-20",comentarios:[{autor:"Você",texto:"Solicitei feedback do plano para Beatriz.",data:"21/05/2025"}]},
  {empresa:"Ideale",consultor:"Aguinaldo",area:"Auren Scale",start:"2025-01-06",mes_atual:4,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"concluido",plano_6m:"concluido",zoho:"concluido",acompanhamento:"em_andamento"},reunioes_realizadas:17,reunioes_total:18,tecnicos_mes:1,alertas:[],status_renovacao:"ativo",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-22",comentarios:[]},
  {empresa:"Casa Bar",consultor:"Ytalo",area:"Auren Prime",start:"2025-01-05",mes_atual:5,status_etapas:{plano_24h:"atrasado",validacao:"pendente",envio_cliente:"pendente",plano_6m:"pendente",zoho:"pendente",acompanhamento:"pendente"},reunioes_realizadas:8,reunioes_total:18,tecnicos_mes:0,alertas:["atraso","reclamacao","renovacao","tecnico_pendente","zoho_desatualizado"],status_renovacao:"renovacao",reclamacoes:2,zoho_ultima_atualizacao:"2025-05-08",comentarios:[{autor:"HEAD",texto:"Preciso de um plano de ação urgente.",data:"22/05/2025"}]},
  {empresa:"Comercial Vidanova",consultor:"Daniela",area:"Auren Scale",start:"2025-01-05",mes_atual:3,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"aprovado",plano_6m:"em_andamento",zoho:"em_andamento",acompanhamento:"em_andamento"},reunioes_realizadas:14,reunioes_total:18,tecnicos_mes:1,alertas:[],status_renovacao:"ativo",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-21",comentarios:[]},
  {empresa:"BGM Calçados",consultor:"Ytalo",area:"Auren Scale",start:"2025-02-01",mes_atual:2,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"concluido",plano_6m:"em_andamento",zoho:"concluido",acompanhamento:"em_andamento"},reunioes_realizadas:6,reunioes_total:8,tecnicos_mes:0,alertas:["sem_reuniao"],status_renovacao:"ativo",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-19",comentarios:[]},
  {empresa:"Miraiyaa",consultor:"Aguinaldo",area:"Auren Scale",start:"2025-01-06",mes_atual:4,status_etapas:{plano_24h:"concluido",validacao:"concluido",envio_cliente:"concluido",plano_6m:"concluido",zoho:"concluido",acompanhamento:"em_andamento"},reunioes_realizadas:16,reunioes_total:18,tecnicos_mes:1,alertas:[],status_renovacao:"renovado",reclamacoes:0,zoho_ultima_atualizacao:"2025-05-22",comentarios:[]},
];

const CONSULTORES_INICIAIS = [
  {nome:"Aguinaldo",tipo:"interno",areas:["Auren Prime","Auren Scale"],email:"aguinaldo@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[{autor:"HEAD",texto:"Melhor consultor do mês de Abril.",data:"01/05/2025"}]},
  {nome:"Beatriz",tipo:"interno",areas:["Auren Scale","Auren ONE"],email:"beatriz@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Endyra",tipo:"interno",areas:["Auren Prime","Auren Scale"],email:"endyra@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Thiago",tipo:"interno",areas:["Auren Scale"],email:"thiago@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Daniela",tipo:"interno",areas:["Auren Scale"],email:"daniela@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Vinicius",tipo:"interno",areas:["Auren Prime"],email:"vinicius@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Ytalo",tipo:"interno",areas:["Auren Prime","Auren Scale"],email:"ytalo@auren.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Rafael",tipo:"licenciado",areas:["Auren X","Auren E-Commerce"],email:"rafael@parceiro.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Carla",tipo:"licenciado",areas:["Auren Brigada Meli","Auren Brigada Ads"],email:"carla@parceiro.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
  {nome:"Pedro",tipo:"licenciado",areas:["Auren Minha Pagina"],email:"pedro@parceiro.com",telefone:"",status:"ativo",obs:"",comentarios:[]},
];

const FATURAMENTO_INICIAIS = [
  {clienteEmpresa:"Cabide Infantil",historico:[{mes:"Jan",valor:38000},{mes:"Fev",valor:45000},{mes:"Mar",valor:62000},{mes:"Abr",valor:78000},{mes:"Mai",valor:95000}],trofeu_entregue:"Citrino"},
  {clienteEmpresa:"Bazzo Outlet",historico:[{mes:"Jan",valor:120000},{mes:"Fev",valor:145000},{mes:"Mar",valor:168000},{mes:"Abr",valor:210000},{mes:"Mai",valor:245000}],trofeu_entregue:"Safira"},
  {clienteEmpresa:"SnackBox",historico:[{mes:"Jan",valor:15000},{mes:"Fev",valor:18000},{mes:"Mar",valor:22000},{mes:"Abr",valor:28000},{mes:"Mai",valor:35000}],trofeu_entregue:null},
  {clienteEmpresa:"Ideale",historico:[{mes:"Jan",valor:480000},{mes:"Fev",valor:510000},{mes:"Mar",valor:540000},{mes:"Abr",valor:580000},{mes:"Mai",valor:620000}],trofeu_entregue:"Esmeralda"},
  {clienteEmpresa:"Casa Bar",historico:[{mes:"Jan",valor:22000},{mes:"Fev",valor:25000},{mes:"Mar",valor:24000},{mes:"Abr",valor:27000},{mes:"Mai",valor:30000}],trofeu_entregue:"Topázio"},
  {clienteEmpresa:"Comercial Vidanova",historico:[{mes:"Jan",valor:88000},{mes:"Fev",valor:95000},{mes:"Mar",valor:105000},{mes:"Abr",valor:118000},{mes:"Mai",valor:132000}],trofeu_entregue:"Citrino"},
  {clienteEmpresa:"BGM Calçados",historico:[{mes:"Jan",valor:55000},{mes:"Fev",valor:60000},{mes:"Mar",valor:58000},{mes:"Abr",valor:65000},{mes:"Mai",valor:72000}],trofeu_entregue:"Citrino"},
  {clienteEmpresa:"Miraiyaa",historico:[{mes:"Jan",valor:310000},{mes:"Fev",valor:345000},{mes:"Mar",valor:380000},{mes:"Abr",valor:420000},{mes:"Mai",valor:468000}],trofeu_entregue:"Esmeralda"},
];

const DEMANDAS_INICIAIS = [
  {titulo:"Casa Bar - cliente insatisfeito com atraso",tipo:"reclamacao",cliente:"Casa Bar",consultor:"Ytalo",prioridade:"alta",prazo:"2025-05-25",status:"pendente",obs:"Cliente ligou reclamando do plano 24h.",criado:"2025-05-22",comentarios:[{autor:"Assistente",texto:"Tentei contato às 14h, não atendeu.",data:"23/05/2025"}]},
  {titulo:"Bazzo Outlet - Zoho desatualizado há 13 dias",tipo:"zoho_desatualizado",cliente:"Bazzo Outlet",consultor:"Vinicius",prioridade:"media",prazo:"2025-05-26",status:"pendente",obs:"Vinicius não atualiza o Zoho desde 10/05.",criado:"2025-05-23",comentarios:[]},
  {titulo:"Validar plano de 6 meses - SnackBox",tipo:"atraso",cliente:"SnackBox",consultor:"Beatriz",prioridade:"alta",prazo:"2025-05-24",status:"em_andamento",obs:"Plano enviado pela Beatriz aguarda validação.",criado:"2025-05-21",comentarios:[]},
];

const ATENDIMENTOS_INICIAIS = [
  {consultor:"Aguinaldo",empresa:"Cabide Infantil",tipo:"tecnico",data:"2025-05-10",duracao:30,status:"realizado",obs:"Dúvida sobre integração"},
  {consultor:"Beatriz",empresa:"SnackBox",tipo:"estrategico",data:"2025-05-08",duracao:60,status:"realizado",obs:"Revisão de estratégia Q2"},
  {consultor:"Ytalo",empresa:"Casa Bar",tipo:"tecnico",data:"2025-05-15",duracao:30,status:"pendente",obs:""},
  {consultor:"Vinicius",empresa:"Bazzo Outlet",tipo:"tecnico",data:"2025-05-20",duracao:30,status:"pendente",obs:"Auren Técnica mensal obrigatória"},
];

// ─── COMPONENTES UTILITÁRIOS ──────────────────────────────────────────────────

const AreaTag = ({area}) => (
  <span style={{background:(COR_AREA[area]||"#64748b")+"22",color:COR_AREA[area]||"#64748b",border:"1px solid "+(COR_AREA[area]||"#64748b")+"44",borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700}}>{area}</span>
);

const ProgressBar = ({value,color}) => (
  <div style={{background:"#e5e7eb",borderRadius:99,height:6,width:"100%"}}>
    <div style={{background:color||"#3b82f6",width:Math.min(value,100)+"%",height:6,borderRadius:99,transition:"width 0.4s"}}/>
  </div>
);

const AlertaBadge = ({tipo}) => {
  const a=ALERTAS_TIPOS[tipo]; if(!a)return null;
  return <span style={{background:a.color+"18",color:a.color,border:"1px solid "+a.color+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{a.icon} {a.label}</span>;
};

const RenovacaoTag = ({status}) => {
  const map={ativo:{label:"Ativo",color:"#10b981"},renovacao:{label:"🔄 Em Renovação",color:"#8b5cf6"},renovado:{label:"✅ Renovado",color:"#3b82f6"},churnou:{label:"❌ Churnou",color:"#ef4444"}};
  const s=map[status]||map.ativo;
  return <span style={{background:s.color+"18",color:s.color,border:"1px solid "+s.color+"33",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700}}>{s.label}</span>;
};

const ComentariosBox = ({comentarios=[],onAdd,autores}) => {
  const [texto,setTexto]=useState("");
  const [autor,setAutor]=useState(autores[0]);
  const enviar = () => {
    if(!texto.trim())return;
    onAdd({autor,texto,data:new Date().toLocaleDateString("pt-BR")});
    setTexto("");
  };
  return (
    <div style={{marginTop:10,background:"#f8fafc",borderRadius:10,padding:12,border:"1px solid #e2e8f0"}}>
      <div style={{fontWeight:700,fontSize:12,color:"#475569",marginBottom:8}}>💬 Comentários</div>
      {comentarios.length===0&&<div style={{fontSize:12,color:"#cbd5e1",marginBottom:8}}>Nenhum comentário ainda.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
        {comentarios.map((c,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:8,padding:"8px 10px",borderLeft:"3px solid "+(AUTOR_COR[c.autor]||"#e2e8f0")}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:700,color:AUTOR_COR[c.autor]||"#64748b"}}>{AUTOR_ICON[c.autor]} {c.autor}</span>
              <span style={{fontSize:10,color:"#cbd5e1"}}>{c.data}</span>
            </div>
            <div style={{fontSize:12,color:"#374151"}}>{c.texto}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <select value={autor} onChange={e=>setAutor(e.target.value)} style={{border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 8px",fontSize:12,background:"#fff",color:AUTOR_COR[autor]||"#374151",fontWeight:700}}>
          {autores.map(a=><option key={a} value={a}>{AUTOR_ICON[a]} {a}</option>)}
        </select>
        <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enviar()} placeholder="Comentário... (Enter para enviar)" style={{flex:1,border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 10px",fontSize:12}}/>
        <button onClick={enviar} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:12}}>Enviar</button>
      </div>
    </div>
  );
};

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"80vh",flexDirection:"column",gap:16}}>
    <div style={{width:48,height:48,border:"4px solid #e2e8f0",borderTop:"4px solid #3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <div style={{color:"#64748b",fontSize:14,fontWeight:600}}>Conectando ao Firebase...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────

export default function App() {
  const [tab,setTab]=useState("painel");
  const [areaFiltro,setAreaFiltro]=useState("Todas");
  const [loading,setLoading]=useState(true);

  // Estado sincronizado com Firebase
  const [clientes,setClientes]=useState([]);
  const [consultores,setConsultores]=useState([]);
  const [atendimentos,setAtendimentos]=useState([]);
  const [demandas,setDemandas]=useState([]);
  const [faturamento,setFaturamento]=useState([]);

  // Modais
  const [showModalCliente,setShowModalCliente]=useState(false);
  const [showModalAtend,setShowModalAtend]=useState(false);
  const [showModalAlerta,setShowModalAlerta]=useState(null);
  const [showModalConsultor,setShowModalConsultor]=useState(false);
  const [showModalDemanda,setShowModalDemanda]=useState(false);
  const [editConsultor,setEditConsultor]=useState(null);
  const [tipoFiltroConsultor,setTipoFiltroConsultor]=useState("todos");

  // Formulários
  const [novoCliente,setNovoCliente]=useState({empresa:"",consultor:"Aguinaldo",area:"Auren Prime",start:new Date().toISOString().split("T")[0]});
  const [novoAtend,setNovoAtend]=useState({empresa:"",tipo:"tecnico",data:new Date().toISOString().split("T")[0],duracao:30,obs:""});
  const [novoAlerta,setNovoAlerta]=useState({tipo:"reclamacao",obs:""});
  const [novoConsultor,setNovoConsultor]=useState({nome:"",tipo:"interno",areas:[],email:"",telefone:"",status:"ativo",obs:""});
  const [novaDemanda,setNovaDemanda]=useState({titulo:"",tipo:"reclamacao",cliente:"",consultor:"Aguinaldo",prioridade:"media",prazo:"",obs:""});

  const [salvoMsg,setSalvoMsg]=useState("");

  // ── Firebase: seed dados iniciais se coleções estiverem vazias ──
  useEffect(()=>{
    const seedColecao = async (nomeCol, dados) => {
      for(const item of dados){
        await addDoc(collection(db, nomeCol), {...item, _seeded: true});
      }
    };

    // Escuta clientes
    const unsubClientes = onSnapshot(collection(db,"clientes"), async snap => {
      if(snap.empty){
        await seedColecao("clientes", CLIENTES_INICIAIS);
      } else {
        setClientes(snap.docs.map(d=>({id:d.id,...d.data()})));
        setLoading(false);
      }
    });

    const unsubConsultores = onSnapshot(collection(db,"consultores"), async snap => {
      if(snap.empty) await seedColecao("consultores", CONSULTORES_INICIAIS);
      else setConsultores(snap.docs.map(d=>({id:d.id,...d.data()})));
    });

    const unsubAtend = onSnapshot(collection(db,"atendimentos"), async snap => {
      if(snap.empty) await seedColecao("atendimentos", ATENDIMENTOS_INICIAIS);
      else setAtendimentos(snap.docs.map(d=>({id:d.id,...d.data()})));
    });

    const unsubDemandas = onSnapshot(collection(db,"demandas"), async snap => {
      if(snap.empty) await seedColecao("demandas", DEMANDAS_INICIAIS);
      else setDemandas(snap.docs.map(d=>({id:d.id,...d.data()})));
    });

    const unsubFat = onSnapshot(collection(db,"faturamento"), async snap => {
      if(snap.empty) await seedColecao("faturamento", FATURAMENTO_INICIAIS);
      else setFaturamento(snap.docs.map(d=>({id:d.id,...d.data()})));
    });

    return ()=>{unsubClientes();unsubConsultores();unsubAtend();unsubDemandas();unsubFat();};
  },[]);

  const toast = (msg) => { setSalvoMsg(msg); setTimeout(()=>setSalvoMsg(""),2500); };

  // ── CRUD Clientes ──
  const addCliente = async () => {
    if(!novoCliente.empresa)return;
    await addDoc(collection(db,"clientes"),{
      ...novoCliente,
      mes_atual:0,
      status_etapas:{plano_24h:"pendente",validacao:"pendente",envio_cliente:"pendente",plano_6m:"pendente",zoho:"pendente",acompanhamento:"pendente"},
      reunioes_realizadas:0,
      reunioes_total:novoCliente.area==="Auren Prime"?18:8,
      tecnicos_mes:0,
      alertas:[],
      status_renovacao:"ativo",
      reclamacoes:0,
      zoho_ultima_atualizacao:"",
      comentarios:[],
      criadoEm:serverTimestamp(),
    });
    setShowModalCliente(false);
    setNovoCliente({empresa:"",consultor:"Aguinaldo",area:"Auren Prime",start:new Date().toISOString().split("T")[0]});
    toast("✅ Cliente adicionado!");
  };

  const updateCliente = async (id, campos) => {
    await updateDoc(doc(db,"clientes",id), campos);
  };

  const updateStatus = (id,etapa,val) => {
    const c = clientes.find(x=>x.id===id);
    updateCliente(id,{status_etapas:{...c.status_etapas,[etapa]:val}});
  };

  const updateRenovacao = (id,val) => updateCliente(id,{status_renovacao:val});

  const removeAlerta = (id,tipo) => {
    const c=clientes.find(x=>x.id===id);
    updateCliente(id,{alertas:c.alertas.filter(a=>a!==tipo)});
  };

  const addAlerta = (clienteId) => {
    const c=clientes.find(x=>x.id===clienteId);
    const novosAlertas=[...new Set([...c.alertas,novoAlerta.tipo])];
    const novasRec=novoAlerta.tipo==="reclamacao"?c.reclamacoes+1:c.reclamacoes;
    updateCliente(clienteId,{alertas:novosAlertas,reclamacoes:novasRec});
    setShowModalAlerta(null);
    setNovoAlerta({tipo:"reclamacao",obs:""});
    toast("🚨 Alerta adicionado!");
  };

  const addComentarioCliente = (id, novo) => {
    const c=clientes.find(x=>x.id===id);
    updateCliente(id,{comentarios:[...(c.comentarios||[]),novo]});
  };

  // ── CRUD Atendimentos ──
  const addAtendimento = async () => {
    const cli=clientes.find(c=>c.empresa===novoAtend.empresa);
    if(!cli)return;
    await addDoc(collection(db,"atendimentos"),{
      ...novoAtend,
      consultor:cli.consultor,
      status:"realizado",
      criadoEm:serverTimestamp(),
    });
    // incrementa técnico se for técnico
    if(novoAtend.tipo==="tecnico"){
      updateCliente(cli.id,{tecnicos_mes:(cli.tecnicos_mes||0)+1});
    }
    setShowModalAtend(false);
    setNovoAtend({empresa:"",tipo:"tecnico",data:new Date().toISOString().split("T")[0],duracao:30,obs:""});
    toast("✅ Atendimento registrado!");
  };

  // ── CRUD Demandas ──
  const addDemanda = async () => {
    if(!novaDemanda.titulo)return;
    await addDoc(collection(db,"demandas"),{
      ...novaDemanda,
      status:"pendente",
      criado:new Date().toISOString().split("T")[0],
      comentarios:[],
      criadoEm:serverTimestamp(),
    });
    setNovaDemanda({titulo:"",tipo:"reclamacao",cliente:"",consultor:"Aguinaldo",prioridade:"media",prazo:"",obs:""});
    setShowModalDemanda(false);
    toast("📬 Demanda criada!");
  };

  const updateDemanda = async (id,campo,val) => {
    await updateDoc(doc(db,"demandas",id),{[campo]:val});
  };

  const removeDemanda = async (id) => {
    await deleteDoc(doc(db,"demandas",id));
  };

  const addComentarioDemanda = async (id, novo) => {
    const d=demandas.find(x=>x.id===id);
    await updateDoc(doc(db,"demandas",id),{comentarios:[...(d.comentarios||[]),novo]});
  };

  // ── CRUD Consultores ──
  const saveConsultor = async () => {
    if(!novoConsultor.nome)return;
    if(editConsultor){
      await updateDoc(doc(db,"consultores",editConsultor),novoConsultor);
      toast("✅ Consultor atualizado!");
    } else {
      await addDoc(collection(db,"consultores"),{...novoConsultor,comentarios:[],criadoEm:serverTimestamp()});
      toast("✅ Consultor adicionado!");
    }
    setShowModalConsultor(false);
    setEditConsultor(null);
    setNovoConsultor({nome:"",tipo:"interno",areas:[],email:"",telefone:"",status:"ativo",obs:""});
  };

  const addComentarioConsultor = async (id, novo) => {
    const c=consultores.find(x=>x.id===id);
    await updateDoc(doc(db,"consultores",id),{comentarios:[...(c.comentarios||[]),novo]});
  };

  // ── Troféus ──
  const marcarTrofeuEntregue = async (fatId,nivel) => {
    await updateDoc(doc(db,"faturamento",fatId),{trofeu_entregue:nivel});
    toast("🏆 Troféu marcado como entregue!");
  };

  const addFaturamentoMes = async (fatId, mes, valor) => {
    const f=faturamento.find(x=>x.id===fatId);
    const novoHist=[...f.historico,{mes,valor}];
    await updateDoc(doc(db,"faturamento",fatId),{historico:novoHist});
    toast("💰 Faturamento atualizado!");
  };

  // ── Computed ──
  const nomeConsultores = [...new Set(consultores.map(c=>c.nome))];
  const filtrados = areaFiltro==="Todas"?clientes:clientes.filter(c=>c.area===areaFiltro);
  const emRenovacao = clientes.filter(c=>c.status_renovacao==="renovacao");
  const comAlerta = clientes.filter(c=>(c.alertas||[]).length>0);

  const stats = {
    total:filtrados.length,
    atrasados:filtrados.filter(c=>(c.alertas||[]).includes("atraso")).length,
    renovacao:emRenovacao.length,
    reclamacoes:filtrados.filter(c=>c.reclamacoes>0).length,
    media_reunioes:filtrados.length?Math.round(filtrados.reduce((a,c)=>a+pct(c.reunioes_realizadas||0,c.reunioes_total||1),0)/filtrados.length):0,
  };

  const rankingConsultores = nomeConsultores.map(nome=>{
    const meus=clientes.filter(c=>c.consultor===nome);
    const meusAtend=atendimentos.filter(a=>a.consultor===nome&&a.status==="realizado");
    const entregas_prazo=meus.filter(c=>!(c.alertas||[]).includes("atraso")).length;
    const renovados=meus.filter(c=>c.status_renovacao==="renovado").length;
    const areas_unicas=[...new Set(meus.map(c=>c.area))];
    const media_reu=meus.length?Math.round(meus.reduce((a,c)=>a+pct(c.reunioes_realizadas||0,c.reunioes_total||1),0)/meus.length):0;
    const score=(renovados*30)+(meusAtend.length*10)+(entregas_prazo*15)+(media_reu*0.3);
    const tipo=consultores.find(c=>c.nome===nome)?.tipo||"interno";
    return {nome,tipo,total_clientes:meus.length,atendimentos:meusAtend.length,entregas_prazo,renovados,areas:areas_unicas,media_reunioes:media_reu,score:Math.round(score)};
  }).filter(c=>c.total_clientes>0).sort((a,b)=>b.score-a.score);

  if(loading) return <Spinner/>;

  // ── MODAL helper ──
  const Modal = ({children,onClose,width=420}) => (
    <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,padding:26,width,boxShadow:"0 8px 32px #0003",maxHeight:"90vh",overflowY:"auto"}}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:"#f1f5f9",minHeight:"100vh",color:"#1e293b"}}>
      {/* Toast */}
      {salvoMsg&&(
        <div style={{position:"fixed",top:20,right:20,background:"#1e293b",color:"#fff",borderRadius:10,padding:"12px 20px",fontWeight:700,fontSize:13,zIndex:9999,boxShadow:"0 4px 20px #0004"}}>
          {salvoMsg}
        </div>
      )}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"14px 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{color:"#fff",fontWeight:800,fontSize:18}}>⚡ Auren · Gestão de Times</div>
            <div style={{color:"#64748b",fontSize:11}}>🔴 Ao vivo · {clientes.length} clientes ativos</div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {AREAS_FILTRO.map(a=>(
              <button key={a} onClick={()=>setAreaFiltro(a)} style={{background:areaFiltro===a?(COR_AREA[a]||"#3b82f6"):"#ffffff14",color:"#fff",border:"none",borderRadius:14,padding:"4px 11px",cursor:"pointer",fontWeight:600,fontSize:11}}>{a}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[
            {id:"painel",label:"📊 Painel"},
            {id:"clientes",label:"🏢 Clientes"},
            {id:"renovacao",label:"🔄 Renovação"+(emRenovacao.length>0?" ("+emRenovacao.length+")":"")},
            {id:"alertas",label:"🚨 Alertas"+(comAlerta.length>0?" ("+comAlerta.length+")":"")},
            {id:"time",label:"👥 Time"},
            {id:"consultores_aba",label:"👔 Consultores"},
            {id:"atendimentos",label:"📞 Atendimentos"},
            {id:"trofeus",label:"🏆 Troféus"},
            {id:"demandas",label:"📬 Demandas"+(demandas.filter(d=>d.status==="pendente").length>0?" ("+demandas.filter(d=>d.status==="pendente").length+")":"")},
            {id:"head",label:"🎯 Relatório HEAD"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#3b82f6":"#ffffff12",color:tab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontWeight:600,fontSize:11}}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:20}}>

        {/* ── PAINEL ── */}
        {tab==="painel"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
              {[
                {label:"Clientes Ativos",value:stats.total,icon:"🏢",color:"#3b82f6"},
                {label:"Com Atraso",value:stats.atrasados,icon:"⏰",color:"#ef4444"},
                {label:"Em Renovação",value:stats.renovacao,icon:"🔄",color:"#8b5cf6"},
                {label:"Reclamações",value:stats.reclamacoes,icon:"🚨",color:"#dc2626"},
                {label:"Média Reuniões",value:stats.media_reunioes+"%",icon:"📅",color:"#10b981"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 4px #0001",borderLeft:"4px solid "+k.color}}>
                  <div style={{fontSize:20}}>{k.icon}</div>
                  <div style={{fontSize:24,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{k.label}</div>
                </div>
              ))}
            </div>
            {emRenovacao.length>0&&(
              <div style={{background:"#faf5ff",border:"1.5px solid #c4b5fd",borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontWeight:700,color:"#7c3aed",marginBottom:10}}>🔄 Clientes em Renovação — Atenção!</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {emRenovacao.map(c=>(
                    <div key={c.id} style={{background:"#fff",borderRadius:10,padding:"10px 14px",border:"1.5px solid #c4b5fd",minWidth:200}}>
                      <div style={{fontWeight:700}}>{c.empresa}</div>
                      <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>👤 {c.consultor} · <AreaTag area={c.area}/></div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>updateRenovacao(c.id,"renovado")} style={{flex:1,background:"#10b981",color:"#fff",border:"none",borderRadius:6,padding:"5px",cursor:"pointer",fontWeight:700,fontSize:12}}>✅ Renovar</button>
                        <button onClick={()=>updateRenovacao(c.id,"churnou")} style={{flex:1,background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"5px",cursor:"pointer",fontWeight:700,fontSize:12}}>❌ Churnou</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {filtrados.map(c=>{
                const p=progCliente(c);const temAtraso=(c.alertas||[]).includes("atraso");const temRec=c.reclamacoes>0;
                return (
                  <div key={c.id} onClick={()=>setTab("clientes")} style={{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 6px #0001",cursor:"pointer",border:temRec?"1.5px solid #fca5a5":temAtraso?"1.5px solid #fcd34d":"1.5px solid #e2e8f0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <div><div style={{fontWeight:700}}>{c.empresa}</div><div style={{fontSize:11,color:"#64748b"}}>👤 {c.consultor} · Mês {c.mes_atual}/6</div></div>
                      <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                        <AreaTag area={c.area}/><RenovacaoTag status={c.status_renovacao}/>
                      </div>
                    </div>
                    <ProgressBar value={p} color={temRec?"#ef4444":temAtraso?"#f59e0b":"#10b981"}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",margin:"3px 0 6px"}}>
                      <span>Progresso {p}%</span><span>Reuniões {pct(c.reunioes_realizadas||0,c.reunioes_total||1)}%</span>
                    </div>
                    {(c.alertas||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.alertas.map(a=><AlertaBadge key={a} tipo={a}/>)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab==="clientes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:18}}>🏢 Gestão de Clientes</div>
              <button onClick={()=>setShowModalCliente(true)} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700}}>+ Novo Cliente</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {filtrados.map(c=>(
                <div key={c.id} style={{background:"#fff",borderRadius:14,padding:18,boxShadow:"0 1px 4px #0001",border:c.reclamacoes>0?"1.5px solid #fca5a5":"1.5px solid #e2e8f0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:15}}>{c.empresa}</span>
                      <AreaTag area={c.area}/><RenovacaoTag status={c.status_renovacao}/>
                      {c.reclamacoes>0&&<span style={{background:"#fef2f2",color:"#dc2626",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>🚨 {c.reclamacoes} reclamação(ões)</span>}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>👤 {c.consultor} · Mês {c.mes_atual}/6</span>
                      <button onClick={()=>setShowModalAlerta(c.id)} style={{background:"#fef2f2",color:"#ef4444",border:"1px solid #fca5a5",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Alerta</button>
                      <select value={c.status_renovacao} onChange={e=>updateRenovacao(c.id,e.target.value)} style={{border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",fontSize:12}}>
                        {["ativo","renovacao","renovado","churnou"].map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {(c.alertas||[]).length>0&&(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      {c.alertas.map(a=>(
                        <span key={a} onClick={()=>removeAlerta(c.id,a)} style={{background:(ALERTAS_TIPOS[a]?.color||"#64748b")+"18",color:ALERTAS_TIPOS[a]?.color||"#64748b",border:"1px solid "+(ALERTAS_TIPOS[a]?.color||"#64748b")+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}} title="Clique para remover">
                          {ALERTAS_TIPOS[a]?.icon} {ALERTAS_TIPOS[a]?.label} ✕
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
                    {FLUXO.map(f=>(
                      <div key={f.id} style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",border:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:11,fontWeight:700,marginBottom:4,color:"#475569"}}>{f.label}{f.prazo&&<span style={{color:"#94a3b8",fontWeight:400}}> ({f.prazo})</span>}</div>
                        <select value={(c.status_etapas||{})[f.id]||"pendente"} onChange={e=>updateStatus(c.id,f.id,e.target.value)} style={{width:"100%",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 6px",fontSize:11}}>
                          {Object.entries(STATUS_ENTREGA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:6}}>
                      <span>
                        <strong>📅 Reuniões:</strong>
                        <input type="number" value={c.reunioes_realizadas||0} min={0} max={c.reunioes_total||18}
                          onChange={e=>updateCliente(c.id,{reunioes_realizadas:parseInt(e.target.value)||0})}
                          style={{width:45,border:"1px solid #e2e8f0",borderRadius:4,padding:"1px 4px",fontSize:11,margin:"0 4px"}}
                        />/{c.reunioes_total} ({pct(c.reunioes_realizadas||0,c.reunioes_total||1)}%)
                      </span>
                      <span>
                        <strong>🔧 Técnicos:</strong>
                        <input type="number" value={c.tecnicos_mes||0} min={0}
                          onChange={e=>updateCliente(c.id,{tecnicos_mes:parseInt(e.target.value)||0})}
                          style={{width:40,border:"1px solid #e2e8f0",borderRadius:4,padding:"1px 4px",fontSize:11,margin:"0 4px"}}
                        />
                        {c.area==="Auren Prime"&&(c.tecnicos_mes||0)===0?"⚠️":""}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:6}}>
                        <strong>🗂 Último Zoho:</strong>
                        <input type="date" value={c.zoho_ultima_atualizacao||""} onChange={e=>{
                          const dias=Math.floor((new Date()-new Date(e.target.value))/86400000);
                          const alertas=(c.alertas||[]).filter(a=>a!=="zoho_desatualizado");
                          if(dias>=7) alertas.push("zoho_desatualizado");
                          updateCliente(c.id,{zoho_ultima_atualizacao:e.target.value,alertas});
                        }} style={{border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 6px",fontSize:11}}/>
                        {c.zoho_ultima_atualizacao&&(()=>{const dias=Math.floor((new Date()-new Date(c.zoho_ultima_atualizacao))/86400000);return <span style={{color:dias>=7?"#ef4444":"#10b981",fontWeight:700}}>{dias>=7?"⚠️ "+dias+"d":"✅ "+dias+"d"}</span>;})()}
                      </span>
                    </div>
                    <ProgressBar value={pct(c.reunioes_realizadas||0,c.reunioes_total||1)} color="#8b5cf6"/>
                  </div>
                  <ComentariosBox comentarios={c.comentarios||[]} autores={AUTORES.cliente} onAdd={novo=>addComentarioCliente(c.id,novo)}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RENOVAÇÃO ── */}
        {tab==="renovacao"&&(
          <div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:16}}>🔄 Gestão de Renovações</div>
            {["renovacao","renovado","churnou"].map(st=>{
              const lista=clientes.filter(c=>c.status_renovacao===st);if(!lista.length)return null;
              const cor=st==="renovacao"?"#8b5cf6":st==="renovado"?"#10b981":"#ef4444";
              const titulo=st==="renovacao"?"🔄 Em Negociação":st==="renovado"?"✅ Renovados":"❌ Churnou";
              return (
                <div key={st} style={{marginBottom:20}}>
                  <div style={{fontWeight:700,color:cor,marginBottom:10}}>{titulo} ({lista.length})</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {lista.map(c=>(
                      <div key={c.id} style={{background:"#fff",borderRadius:12,padding:16,border:"1.5px solid "+cor+"44"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <div><div style={{fontWeight:700}}>{c.empresa}</div><div style={{fontSize:12,color:"#64748b"}}>👤 {c.consultor}</div></div>
                          <AreaTag area={c.area}/>
                        </div>
                        <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>Reuniões: {pct(c.reunioes_realizadas||0,c.reunioes_total||1)}% · Técnicos: {c.tecnicos_mes||0} · Reclamações: {c.reclamacoes||0}</div>
                        <ProgressBar value={progCliente(c)} color={cor}/>
                        <div style={{fontSize:11,color:"#94a3b8",margin:"3px 0 8px"}}>Progresso: {progCliente(c)}%</div>
                        {st==="renovacao"&&(
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>updateRenovacao(c.id,"renovado")} style={{flex:1,background:"#10b981",color:"#fff",border:"none",borderRadius:7,padding:"7px",cursor:"pointer",fontWeight:700}}>✅ Renovar</button>
                            <button onClick={()=>updateRenovacao(c.id,"churnou")} style={{flex:1,background:"#ef4444",color:"#fff",border:"none",borderRadius:7,padding:"7px",cursor:"pointer",fontWeight:700}}>❌ Churnou</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {emRenovacao.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40}}>Nenhum cliente em renovação no momento.</div>}
          </div>
        )}

        {/* ── ALERTAS ── */}
        {tab==="alertas"&&(
          <div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:16}}>🚨 Central de Alertas</div>
            {Object.entries(ALERTAS_TIPOS).map(([tipo,info])=>{
              const lista=filtrados.filter(c=>(c.alertas||[]).includes(tipo));if(!lista.length)return null;
              return (
                <div key={tipo} style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:18}}>{info.icon}</span>
                    <span style={{fontWeight:700,color:info.color}}>{info.label}</span>
                    <span style={{background:info.color+"18",color:info.color,borderRadius:99,padding:"1px 10px",fontSize:12,fontWeight:700}}>{lista.length}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                    {lista.map(c=>(
                      <div key={c.id} style={{background:"#fff",borderRadius:10,padding:14,border:"1.5px solid "+info.color+"33"}}>
                        <div style={{fontWeight:700}}>{c.empresa}</div>
                        <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>👤 {c.consultor} · <AreaTag area={c.area}/></div>
                        <button onClick={()=>removeAlerta(c.id,tipo)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>✓ Resolver</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {comAlerta.filter(c=>areaFiltro==="Todas"||c.area===areaFiltro).length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40}}>✅ Nenhum alerta ativo.</div>}
          </div>
        )}

        {/* ── TIME ── */}
        {tab==="time"&&(
          <div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:16}}>👥 Desempenho do Time</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {rankingConsultores.map((c,i)=>{
                const tipo=TIPO_CONSULTOR[c.tipo]||TIPO_CONSULTOR.interno;
                return (
                  <div key={c.nome} style={{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 4px #0001",border:i===0?"1.5px solid #f59e0b":"1.5px solid #e2e8f0",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{fontSize:26,minWidth:36,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1)}</div>
                    <div style={{flex:1,minWidth:130}}>
                      <div style={{fontWeight:700,fontSize:15}}>{c.nome}</div>
                      <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                        <span style={{background:tipo.color+"18",color:tipo.color,border:"1px solid "+tipo.color+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{tipo.icon} {tipo.label}</span>
                        {c.areas.map(a=><AreaTag key={a} area={a}/>)}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,flex:3,minWidth:280}}>
                      {[{label:"Clientes",value:c.total_clientes,color:"#3b82f6"},{label:"Atendimentos",value:c.atendimentos,color:"#8b5cf6"},{label:"No Prazo",value:c.entregas_prazo,color:"#10b981"},{label:"Renovados",value:c.renovados,color:"#f59e0b"},{label:"Reuniões %",value:c.media_reunioes+"%",color:"#06b6d4"}].map(m=>(
                        <div key={m.label} style={{textAlign:"center",background:"#f8fafc",borderRadius:8,padding:"7px 4px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:m.color}}>{m.value}</div>
                          <div style={{fontSize:10,color:"#94a3b8"}}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{textAlign:"center",minWidth:50}}>
                      <div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{c.score}</div>
                      <div style={{fontSize:10,color:"#94a3b8"}}>Score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONSULTORES ── */}
        {tab==="consultores_aba"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div><div style={{fontWeight:700,fontSize:18}}>👔 Gestão de Consultores</div><div style={{fontSize:12,color:"#64748b"}}>Internos e Licenciados</div></div>
              <button onClick={()=>{setEditConsultor(null);setNovoConsultor({nome:"",tipo:"interno",areas:[],email:"",telefone:"",status:"ativo",obs:""});setShowModalConsultor(true);}} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700}}>+ Novo Consultor</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[{id:"todos",label:"Todos"},{id:"interno",label:"🏢 Internos"},{id:"licenciado",label:"🤝 Licenciados"}].map(f=>(
                <button key={f.id} onClick={()=>setTipoFiltroConsultor(f.id)} style={{background:tipoFiltroConsultor===f.id?"#3b82f6":"#fff",color:tipoFiltroConsultor===f.id?"#fff":"#475569",border:"1.5px solid "+(tipoFiltroConsultor===f.id?"#3b82f6":"#e2e8f0"),borderRadius:20,padding:"6px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>{f.label}</button>
              ))}
            </div>
            {["interno","licenciado"].filter(t=>tipoFiltroConsultor==="todos"||tipoFiltroConsultor===t).map(tipo=>{
              const lista=consultores.filter(c=>c.tipo===tipo);
              const info=TIPO_CONSULTOR[tipo];
              return (
                <div key={tipo} style={{marginBottom:24}}>
                  <div style={{fontWeight:700,color:info.color,fontSize:15,marginBottom:10}}>{info.icon} Consultores {info.label}s ({lista.length})</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
                    {lista.map(c=>{
                      const meusClientes=clientes.filter(cl=>cl.consultor===c.nome);
                      const rank=rankingConsultores.find(r=>r.nome===c.nome);
                      return (
                        <div key={c.id} style={{background:"#fff",borderRadius:14,padding:16,border:"1.5px solid "+info.color+"33"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                            <div>
                              <div style={{fontWeight:800,fontSize:15}}>{c.nome}</div>
                              <span style={{background:info.color+"18",color:info.color,border:"1px solid "+info.color+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{info.icon} {info.label}</span>
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <span style={{background:c.status==="ativo"?"#dcfce7":"#fef2f2",color:c.status==="ativo"?"#16a34a":"#dc2626",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{c.status==="ativo"?"✅ Ativo":"⏸ Inativo"}</span>
                              <button onClick={()=>{setEditConsultor(c.id);setNovoConsultor({nome:c.nome,tipo:c.tipo,areas:c.areas,email:c.email,telefone:c.telefone,status:c.status,obs:c.obs});setShowModalConsultor(true);}} style={{background:"#f1f5f9",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#64748b"}}>✏️</button>
                            </div>
                          </div>
                          {c.email&&<div style={{fontSize:12,color:"#64748b",marginBottom:4}}>📧 {c.email}</div>}
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{(c.areas||[]).map(a=><AreaTag key={a} area={a}/>)}</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:4}}>
                            {[{label:"Clientes",value:meusClientes.length,color:"#3b82f6"},{label:"Score",value:rank?.score||0,color:"#f59e0b"},{label:"Reuniões",value:(rank?.media_reunioes||0)+"%",color:"#10b981"}].map(m=>(
                              <div key={m.label} style={{background:"#f8fafc",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                                <div style={{fontWeight:700,color:m.color,fontSize:16}}>{m.value}</div>
                                <div style={{fontSize:10,color:"#94a3b8"}}>{m.label}</div>
                              </div>
                            ))}
                          </div>
                          <ComentariosBox comentarios={c.comentarios||[]} autores={AUTORES.time} onAdd={novo=>addComentarioConsultor(c.id,novo)}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ATENDIMENTOS ── */}
        {tab==="atendimentos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:18}}>📞 Atendimentos</div>
              <button onClick={()=>setShowModalAtend(true)} style={{background:"#8b5cf6",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700}}>+ Novo Atendimento</button>
            </div>
            <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:12,marginBottom:16,fontSize:13}}>
              ⚠️ <strong>Clientes Auren Prime sem Auren Técnica este mês:</strong> {clientes.filter(c=>c.area==="Auren Prime"&&(c.tecnicos_mes||0)===0).map(c=>c.empresa).join(", ")||"Todos em dia ✅"}
            </div>
            <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px #0001"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f1f5f9"}}>
                    {["Data","Consultor","Empresa","Tipo","Duração","Status","Obs"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#475569",borderBottom:"2px solid #e2e8f0"}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {atendimentos.sort((a,b)=>b.data?.localeCompare(a.data)).map(a=>(
                    <tr key={a.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"9px 12px"}}>{a.data}</td>
                      <td style={{padding:"9px 12px",fontWeight:600}}>{a.consultor}</td>
                      <td style={{padding:"9px 12px"}}>{a.empresa}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:a.tipo==="tecnico"?"#fef3c7":"#ede9fe",color:a.tipo==="tecnico"?"#d97706":"#7c3aed",borderRadius:6,padding:"2px 10px",fontWeight:700,fontSize:12}}>{a.tipo==="tecnico"?"🔧 Auren Técnica":"📈 Estratégico"}</span></td>
                      <td style={{padding:"9px 12px"}}>{a.duracao} min</td>
                      <td style={{padding:"9px 12px"}}><span style={{color:a.status==="realizado"?"#10b981":"#f59e0b",fontWeight:700}}>{a.status==="realizado"?"✅ Realizado":"⏳ Pendente"}</span></td>
                      <td style={{padding:"9px 12px",color:"#94a3b8",fontSize:12}}>{a.obs||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TROFÉUS ── */}
        {tab==="trofeus"&&(
          <div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:4}}>🏆 Troféus e Faturamento</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>Acompanhe a evolução e os troféus a entregar</div>
            {(()=>{
              const precisamTrofeu=faturamento.filter(f=>{const fat=(f.historico||[])[f.historico.length-1]?.valor||0;const t=getTrofeu(fat);return t&&t.nivel!==f.trofeu_entregue;});
              return precisamTrofeu.length>0?(
                <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:12,padding:14,marginBottom:16}}>
                  <div style={{fontWeight:700,color:"#d97706",marginBottom:10}}>🎯 {precisamTrofeu.length} cliente(s) precisam receber troféu!</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {precisamTrofeu.map(f=>{
                      const fat=(f.historico||[])[f.historico.length-1]?.valor||0;const t=getTrofeu(fat);
                      return t?(
                        <div key={f.id} style={{background:t.bg,border:"1.5px solid "+t.cor+"44",borderRadius:10,padding:"10px 14px",minWidth:180}}>
                          <div style={{fontWeight:700,fontSize:13}}>{f.clienteEmpresa}</div>
                          <div style={{fontSize:20,margin:"4px 0"}}>{t.emoji} <span style={{color:t.cor,fontWeight:800}}>{t.nivel}</span></div>
                          <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{fmtBRL(fat)}</div>
                          <button onClick={()=>marcarTrofeuEntregue(f.id,t.nivel)} style={{background:t.cor,color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:12,width:"100%"}}>✅ Marcar entregue</button>
                        </div>
                      ):null;
                    })}
                  </div>
                </div>
              ):null;
            })()}
            <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:16,border:"1.5px solid #e2e8f0"}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📊 Escala de Troféus</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {TROFEUS.map(t=>(
                  <div key={t.nivel} style={{background:t.bg,border:"1.5px solid "+t.cor+"44",borderRadius:8,padding:"6px 12px",textAlign:"center",minWidth:90}}>
                    <div style={{fontSize:18}}>{t.emoji}</div>
                    <div style={{fontSize:11,fontWeight:700,color:t.cor}}>{t.nivel}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>{fmtBRL(t.min)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}}>
              {faturamento.map(f=>{
                const hist=f.historico||[];
                const fatAtual=hist[hist.length-1]?.valor||0;
                const fatAnterior=hist[hist.length-2]?.valor||0;
                const variacao=fatAnterior>0?((fatAtual-fatAnterior)/fatAnterior*100).toFixed(1):null;
                const t=getTrofeu(fatAtual);const prox=getProximo(fatAtual);
                const pctNivel=t&&prox?Math.round(((fatAtual-t.min)/(prox.min-t.min))*100):100;
                const cli=clientes.find(c=>c.empresa===f.clienteEmpresa);
                const precisaTrofeu=t&&t.nivel!==f.trofeu_entregue;
                const maxVal=Math.max(...hist.map(x=>x.valor),1);
                const [novoMes,setNovoMes]=useState("");const [novoValor,setNovoValor]=useState("");
                return (
                  <div key={f.id} style={{background:"#fff",borderRadius:14,padding:16,border:precisaTrofeu?"1.5px solid "+(t?.cor||"#e2e8f0")+"88":"1.5px solid #e2e8f0",boxShadow:precisaTrofeu?"0 4px 16px "+(t?.cor||"#000")+"22":"0 1px 4px #0001"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:15}}>{f.clienteEmpresa}</div>
                        {cli&&<div style={{fontSize:11,color:"#64748b"}}>👤 {cli.consultor} · <AreaTag area={cli.area}/></div>}
                      </div>
                      {t&&<div style={{background:t.bg,border:"1.5px solid "+t.cor+"44",borderRadius:10,padding:"6px 12px",textAlign:"center"}}><div style={{fontSize:22}}>{t.emoji}</div><div style={{fontSize:11,fontWeight:800,color:t.cor}}>{t.nivel}</div></div>}
                    </div>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                      <span style={{fontSize:24,fontWeight:900,color:t?.cor||"#374151"}}>{fmtBRL(fatAtual)}</span>
                      {variacao!==null&&<span style={{fontSize:12,fontWeight:700,color:parseFloat(variacao)>=0?"#10b981":"#ef4444"}}>{parseFloat(variacao)>=0?"▲":"▼"} {Math.abs(variacao)}%</span>}
                    </div>
                    {prox&&(
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginBottom:3}}>
                          <span>Para {prox.emoji} {prox.nivel}</span>
                          <span style={{fontWeight:700}}>faltam {fmtBRL(prox.min-fatAtual)}</span>
                        </div>
                        <div style={{background:"#e2e8f0",borderRadius:99,height:8}}>
                          <div style={{background:"linear-gradient(90deg,"+(t?.cor||"#3b82f6")+","+prox.cor+")",width:pctNivel+"%",height:8,borderRadius:99}}/>
                        </div>
                      </div>
                    )}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>Evolução mensal</div>
                      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:40}}>
                        {hist.map((h,i)=>{const hPct=Math.round((h.valor/maxVal)*100);const isLast=i===hist.length-1;return(
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <div style={{width:"100%",background:isLast?(t?.cor||"#3b82f6"):(t?.cor||"#3b82f6")+"44",borderRadius:"3px 3px 0 0",height:hPct+"%",minHeight:4}} title={fmtBRL(h.valor)}/>
                            <div style={{fontSize:9,color:"#94a3b8"}}>{h.mes}</div>
                          </div>
                        );})}
                      </div>
                    </div>
                    {/* Adicionar novo mês de faturamento */}
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      <input placeholder="Mês (ex: Jun)" value={novoMes} onChange={e=>setNovoMes(e.target.value)} style={{flex:1,border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",fontSize:11}}/>
                      <input placeholder="Valor (ex: 150000)" type="number" value={novoValor} onChange={e=>setNovoValor(e.target.value)} style={{flex:2,border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",fontSize:11}}/>
                      <button onClick={()=>{if(novoMes&&novoValor){addFaturamentoMes(f.id,novoMes,parseFloat(novoValor));setNovoMes("");setNovoValor("");}}} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>+</button>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      {precisaTrofeu?<span style={{background:t.bg,color:t.cor,border:"1px solid "+t.cor+"44",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>🎁 Troféu {t.nivel} a entregar!</span>:<span style={{background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>✅ {f.trofeu_entregue||"Sem troféu"}</span>}
                      {precisaTrofeu&&<button onClick={()=>marcarTrofeuEntregue(f.id,t.nivel)} style={{background:t.cor,color:"#fff",border:"none",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontWeight:700,fontSize:11}}>Marcar entregue</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DEMANDAS ── */}
        {tab==="demandas"&&(()=>{
          const PRIORIDADE={alta:{label:"Alta",color:"#ef4444"},media:{label:"Média",color:"#f59e0b"},baixa:{label:"Baixa",color:"#10b981"}};
          const STATUS_D={pendente:{label:"Pendente",color:"#f59e0b"},em_andamento:{label:"Em Andamento",color:"#3b82f6"},resolvido:{label:"Resolvido",color:"#10b981"}};
          const hoje=new Date();
          const diasRestantes=prazo=>Math.ceil((new Date(prazo)-hoje)/86400000);
          const pendentes=demandas.filter(d=>d.status!=="resolvido").sort((a,b)=>({alta:0,media:1,baixa:2}[a.prioridade]-{alta:0,media:1,baixa:2}[b.prioridade]));
          const resolvidos=demandas.filter(d=>d.status==="resolvido");
          return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div><div style={{fontWeight:800,fontSize:18}}>📬 Caixa de Demandas</div><div style={{fontSize:12,color:"#64748b"}}>Casos que precisam da sua atenção</div></div>
                <button onClick={()=>setShowModalDemanda(true)} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:700}}>+ Nova Demanda</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {[{label:"Pendentes",value:demandas.filter(d=>d.status==="pendente").length,color:"#f59e0b"},{label:"Em Andamento",value:demandas.filter(d=>d.status==="em_andamento").length,color:"#3b82f6"},{label:"Resolvidas",value:resolvidos.length,color:"#10b981"}].map(k=>(
                  <div key={k.label} style={{background:"#fff",borderRadius:12,padding:"14px 18px",borderLeft:"4px solid "+k.color,boxShadow:"0 1px 4px #0001"}}>
                    <div style={{fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
                {pendentes.map(d=>{
                  const dias=d.prazo?diasRestantes(d.prazo):null;
                  const vencido=dias!==null&&dias<0;const urgente=dias!==null&&dias<=1&&dias>=0;
                  const pr=PRIORIDADE[d.prioridade];const st=STATUS_D[d.status];const alerta=ALERTAS_TIPOS[d.tipo];
                  return (
                    <div key={d.id} style={{background:"#fff",borderRadius:14,padding:18,boxShadow:"0 2px 8px #0001",border:vencido?"1.5px solid #fca5a5":urgente?"1.5px solid #fcd34d":"1.5px solid "+pr.color+"22"}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                            <span style={{fontWeight:800,fontSize:14}}>{d.titulo}</span>
                            <span style={{background:pr.color+"18",color:pr.color,border:"1px solid "+pr.color+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>🔺 {pr.label}</span>
                            {alerta&&<span style={{background:alerta.color+"18",color:alerta.color,border:"1px solid "+alerta.color+"33",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{alerta.icon} {alerta.label}</span>}
                          </div>
                          <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>{d.cliente&&<span>🏢 {d.cliente} · </span>}<span>👤 {d.consultor} · </span><span>📅 {d.criado}</span></div>
                          {d.obs&&<div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#475569",borderLeft:"3px solid #e2e8f0",marginBottom:4}}>{d.obs}</div>}
                          <ComentariosBox comentarios={d.comentarios||[]} autores={AUTORES.demanda} onAdd={novo=>addComentarioDemanda(d.id,novo)}/>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",minWidth:150}}>
                          {d.prazo&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#94a3b8"}}>Prazo</div><div style={{fontWeight:700,fontSize:13,color:vencido?"#ef4444":urgente?"#f59e0b":"#475569"}}>{vencido?"⚠️ Vencido ("+Math.abs(dias)+"d)":urgente?"🔥 Hoje/Amanhã":"📅 "+d.prazo+" ("+dias+"d)"}</div></div>}
                          <select value={d.status} onChange={e=>updateDemanda(d.id,"status",e.target.value)} style={{border:"1.5px solid "+st.color+"44",borderRadius:8,padding:"5px 8px",fontSize:12,color:st.color,fontWeight:700,background:st.color+"11",cursor:"pointer"}}>
                            {Object.entries(STATUS_D).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <button onClick={()=>removeDemanda(d.id)} style={{background:"#fef2f2",color:"#ef4444",border:"1px solid #fca5a5",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>Remover</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {pendentes.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40,background:"#fff",borderRadius:14}}>✅ Nenhuma demanda pendente!</div>}
              </div>
              {resolvidos.length>0&&(
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:10}}>✅ Resolvidas ({resolvidos.length})</div>
                  {resolvidos.map(d=>(
                    <div key={d.id} style={{background:"#f8fafc",borderRadius:10,padding:"10px 16px",border:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,opacity:0.7}}>
                      <div><div style={{fontWeight:600,fontSize:13,textDecoration:"line-through",color:"#94a3b8"}}>{d.titulo}</div><div style={{fontSize:11,color:"#94a3b8"}}>👤 {d.consultor}</div></div>
                      <button onClick={()=>removeDemanda(d.id)} style={{background:"transparent",color:"#cbd5e1",border:"none",cursor:"pointer",fontSize:16}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── RELATÓRIO HEAD ── */}
        {tab==="head"&&(()=>{
          const mes="Maio/2025";
          const clientesAtivos=clientes.filter(c=>c.status_renovacao!=="churnou").length;
          const semAlerta=clientes.filter(c=>(c.alertas||[]).length===0).length;
          const scoreAtendimento=clientes.length?Math.round((semAlerta/clientes.length)*100):0;
          const ganhadosAbril=clientes.filter(c=>c.status_renovacao==="renovado").length;
          const emRenovacaoAbril=clientes.filter(c=>["renovacao","renovado","churnou"].includes(c.status_renovacao)).length;
          const pctGanhos=emRenovacaoAbril>0?Math.round((ganhadosAbril/emRenovacaoAbril)*100):0;
          const comReuniao=clientes.filter(c=>(c.reunioes_realizadas||0)>0).length;
          const totalReu=clientes.reduce((a,c)=>a+(c.reunioes_realizadas||0),0);
          const totalReuPossivel=clientes.reduce((a,c)=>a+(c.reunioes_total||1),0);
          const pctReu=Math.round((totalReu/totalReuPossivel)*100);
          const renovacaoMaio=clientes.filter(c=>c.status_renovacao==="renovacao").length;
          const revisadosMaio=clientes.filter(c=>c.mes_atual>=5).length;
          const pctRevisados=clientesAtivos?Math.round((revisadosMaio/clientesAtivos)*100):0;
          const visitadosMaio=clientes.filter(c=>(c.reunioes_realizadas||0)>0&&c.mes_atual>=5).length;
          const pctVisitados=clientesAtivos?Math.round((visitadosMaio/clientesAtivos)*100):0;
          const churn=clientes.filter(c=>c.status_renovacao==="churnou").length;
          const pctChurn=Math.round((churn/(clientesAtivos+churn||1))*100);
          const KPI=({label,value,sub,color,destaque})=>(
            <div style={{background:destaque?"linear-gradient(135deg,"+color+"ee,"+color+"bb)":"#fff",borderRadius:14,padding:"16px 18px",border:destaque?"none":"1.5px solid "+color+"33",boxShadow:destaque?"0 4px 20px "+color+"44":"0 1px 4px #0001"}}>
              <div style={{fontSize:11,fontWeight:600,color:destaque?"#ffffffbb":"#64748b",textTransform:"uppercase",letterSpacing:1}}>{label}</div>
              <div style={{fontSize:32,fontWeight:900,color:destaque?"#fff":color,lineHeight:1.1}}>{value}</div>
              {sub&&<div style={{fontSize:12,color:destaque?"#ffffffaa":"#94a3b8"}}>{sub}</div>}
            </div>
          );
          const Div=({title})=>(
            <div style={{display:"flex",alignItems:"center",gap:12,margin:"12px 0 8px"}}>
              <div style={{height:1,flex:1,background:"#e2e8f0"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1}}>{title}</span>
              <div style={{height:1,flex:1,background:"#e2e8f0"}}/>
            </div>
          );
          return (
            <div>
              <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a5f)",borderRadius:16,padding:"22px 26px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{color:"#fff",fontWeight:900,fontSize:22}}>Relatório de Gestão · Auren</div><div style={{color:"#94a3b8",fontSize:13,marginTop:2}}>Visão executiva · {mes}</div></div>
                <div style={{textAlign:"right"}}><div style={{color:"#3b82f6",fontWeight:800,fontSize:28}}>{scoreAtendimento}%</div><div style={{color:"#94a3b8",fontSize:12}}>Score Saúde Geral</div></div>
              </div>
              <Div title="Visão Geral"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:4}}>
                <KPI label="Total de Consultores" value={consultores.filter(c=>c.status==="ativo").length} sub="consultores ativos" color="#3b82f6" destaque/>
                <KPI label="Clientes Ativos" value={clientesAtivos} sub="na carteira atual" color="#10b981" destaque/>
                <KPI label="Score Saúde" value={scoreAtendimento+"%"} sub={semAlerta+" clientes sem alertas"} color="#8b5cf6" destaque/>
              </div>
              <Div title="Reuniões"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:8}}>
                <KPI label="Com Reunião Realizada" value={comReuniao} sub={"de "+clientesAtivos+" ativos"} color="#3b82f6"/>
                <KPI label="% Reuniões Realizadas" value={pctReu+"%"} sub={totalReu+" de "+totalReuPossivel} color={pctReu>=70?"#10b981":pctReu>=50?"#f59e0b":"#ef4444"}/>
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:"12px 16px",marginBottom:4,border:"1.5px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b",marginBottom:6}}><span>Progresso Reuniões — {mes}</span><span style={{fontWeight:700,color:"#3b82f6"}}>{pctReu}%</span></div>
                <div style={{background:"#e2e8f0",borderRadius:99,height:10}}><div style={{background:pctReu>=70?"#10b981":pctReu>=50?"#f59e0b":"#ef4444",width:pctReu+"%",height:10,borderRadius:99}}/></div>
              </div>
              <Div title="Renovação"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:4}}>
                <KPI label="Em Renovação" value={emRenovacaoAbril} sub="entraram em renovação" color="#8b5cf6"/>
                <KPI label="Renovados" value={ganhadosAbril} sub="contratos renovados" color="#10b981"/>
                <KPI label="Taxa de Renovação" value={pctGanhos+"%"} sub="" color={pctGanhos>=70?"#10b981":pctGanhos>=50?"#f59e0b":"#ef4444"}/>
              </div>
              <Div title="Acompanhamento — Maio"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:4}}>
                <KPI label="Em Renovação Maio" value={renovacaoMaio} sub="aguardando decisão" color="#8b5cf6"/>
                <KPI label="% Revisados" value={pctRevisados+"%"} sub="meta: 100%" color={pctRevisados>=80?"#10b981":"#f59e0b"}/>
                <KPI label="% Visitados" value={pctVisitados+"%"} sub={visitadosMaio+" com reunião"} color={pctVisitados>=80?"#10b981":pctVisitados>=60?"#f59e0b":"#ef4444"}/>
                <KPI label="Churn" value={churn+" ("+pctChurn+"%)"} sub="contratos encerrados" color="#ef4444" destaque={churn>0}/>
              </div>
              <Div title="Top Consultores"/>
              <div style={{background:"#fff",borderRadius:14,overflow:"hidden",border:"1.5px solid #e2e8f0"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"#f1f5f9"}}>{["#","Consultor","Tipo","Clientes","Atendimentos","Renovados","Reuniões","Score"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#475569",borderBottom:"2px solid #e2e8f0",fontSize:12}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rankingConsultores.map((c,i)=>{
                      const tp=TIPO_CONSULTOR[c.tipo]||TIPO_CONSULTOR.interno;
                      return (
                        <tr key={c.nome} style={{borderBottom:"1px solid #f1f5f9",background:i===0?"#fffbeb":"transparent"}}>
                          <td style={{padding:"10px 12px",fontSize:16}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)}</td>
                          <td style={{padding:"10px 12px",fontWeight:700}}>{c.nome}</td>
                          <td style={{padding:"10px 12px"}}><span style={{background:tp.color+"18",color:tp.color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{tp.icon} {tp.label}</span></td>
                          <td style={{padding:"10px 12px",color:"#3b82f6",fontWeight:700}}>{c.total_clientes}</td>
                          <td style={{padding:"10px 12px",color:"#8b5cf6",fontWeight:700}}>{c.atendimentos}</td>
                          <td style={{padding:"10px 12px",color:"#10b981",fontWeight:700}}>{c.renovados}</td>
                          <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{background:"#e2e8f0",borderRadius:99,height:6,width:50}}><div style={{background:c.media_reunioes>=70?"#10b981":"#f59e0b",width:c.media_reunioes+"%",height:6,borderRadius:99}}/></div><span style={{fontSize:12,color:"#64748b"}}>{c.media_reunioes}%</span></div></td>
                          <td style={{padding:"10px 12px",fontWeight:800,color:"#f59e0b",fontSize:15}}>{c.score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── MODAIS ── */}
      {showModalCliente&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:16,padding:26,width:420,boxShadow:"0 8px 32px #0003"}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16}}>➕ Novo Cliente</div>
            {[{label:"Empresa",key:"empresa",type:"text"},{label:"Data de Start",key:"start",type:"date"}].map(f=>(
              <div key={f.key} style={{marginBottom:12}}>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>{f.label}</label>
                <input type={f.type} value={novoCliente[f.key]} onChange={e=>setNovoCliente(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Consultor</label>
              <select value={novoCliente.consultor} onChange={e=>setNovoCliente(p=>({...p,consultor:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                {consultores.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Produto</label>
              <select value={novoCliente.area} onChange={e=>setNovoCliente(p=>({...p,area:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                {AREAS.slice(1).map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
              <button onClick={()=>setShowModalCliente(false)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={addCliente} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:700}}>Salvar no Firebase</button>
            </div>
          </div>
        </div>
      )}

      {showModalAtend&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:16,padding:26,width:420,boxShadow:"0 8px 32px #0003"}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16}}>📞 Novo Atendimento</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Cliente</label>
              <select value={novoAtend.empresa} onChange={e=>setNovoAtend(p=>({...p,empresa:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.empresa}>{c.empresa} ({c.consultor})</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Tipo</label>
              <select value={novoAtend.tipo} onChange={e=>setNovoAtend(p=>({...p,tipo:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                <option value="tecnico">🔧 Auren Técnica</option>
                <option value="estrategico">📈 Estratégico</option>
              </select>
            </div>
            {[{label:"Data",key:"data",type:"date"},{label:"Duração (min)",key:"duracao",type:"number"}].map(f=>(
              <div key={f.key} style={{marginBottom:12}}>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>{f.label}</label>
                <input type={f.type} value={novoAtend[f.key]} onChange={e=>setNovoAtend(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Observação</label>
              <input value={novoAtend.obs} onChange={e=>setNovoAtend(p=>({...p,obs:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModalAtend(false)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={addAtendimento} style={{background:"#8b5cf6",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:700}}>Salvar no Firebase</button>
            </div>
          </div>
        </div>
      )}

      {showModalAlerta&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:16,padding:26,width:380,boxShadow:"0 8px 32px #0003"}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16}}>🚨 Adicionar Alerta</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Tipo</label>
              <select value={novoAlerta.tipo} onChange={e=>setNovoAlerta(p=>({...p,tipo:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                {Object.entries(ALERTAS_TIPOS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Observação</label>
              <input value={novoAlerta.obs} onChange={e=>setNovoAlerta(p=>({...p,obs:e.target.value}))} placeholder="Descreva o ocorrido..." style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModalAlerta(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={()=>addAlerta(showModalAlerta)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:700}}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showModalDemanda&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:16,padding:26,width:480,boxShadow:"0 8px 32px #0003",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:16}}>📬 Nova Demanda</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Título</label>
              <input value={novaDemanda.titulo} onChange={e=>setNovaDemanda(p=>({...p,titulo:e.target.value}))} placeholder="Descreva brevemente o caso..." style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Tipo</label>
                <select value={novaDemanda.tipo} onChange={e=>setNovaDemanda(p=>({...p,tipo:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 10px",fontSize:13}}>
                  {Object.entries(ALERTAS_TIPOS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Prioridade</label>
                <select value={novaDemanda.prioridade} onChange={e=>setNovaDemanda(p=>({...p,prioridade:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 10px",fontSize:13}}>
                  <option value="alta">🔴 Alta</option><option value="media">🟡 Média</option><option value="baixa">🟢 Baixa</option>
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Consultor</label>
                <select value={novaDemanda.consultor} onChange={e=>setNovaDemanda(p=>({...p,consultor:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 10px",fontSize:13}}>
                  {consultores.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Cliente</label>
                <select value={novaDemanda.cliente} onChange={e=>setNovaDemanda(p=>({...p,cliente:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 10px",fontSize:13}}>
                  <option value="">— Selecionar —</option>
                  {clientes.map(c=><option key={c.id} value={c.empresa}>{c.empresa}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Prazo</label>
              <input type="date" value={novaDemanda.prazo} onChange={e=>setNovaDemanda(p=>({...p,prazo:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Observação / Contexto</label>
              <textarea value={novaDemanda.obs} onChange={e=>setNovaDemanda(p=>({...p,obs:e.target.value}))} rows={3} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModalDemanda(false)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={addDemanda} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700}}>Salvar no Firebase</button>
            </div>
          </div>
        </div>
      )}

      {showModalConsultor&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:16,padding:26,width:460,boxShadow:"0 8px 32px #0003",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:16}}>{editConsultor?"✏️ Editar Consultor":"👔 Novo Consultor"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Nome</label>
                <input value={novoConsultor.nome} onChange={e=>setNovoConsultor(p=>({...p,nome:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Tipo</label>
                <select value={novoConsultor.tipo} onChange={e=>setNovoConsultor(p=>({...p,tipo:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                  <option value="interno">🏢 Interno</option>
                  <option value="licenciado">🤝 Licenciado</option>
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>E-mail</label>
                <input value={novoConsultor.email} onChange={e=>setNovoConsultor(p=>({...p,email:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Telefone</label>
                <input value={novoConsultor.telefone} onChange={e=>setNovoConsultor(p=>({...p,telefone:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Produtos que atende</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {AREAS.slice(1).map(a=>(
                  <button key={a} onClick={()=>setNovoConsultor(p=>({...p,areas:p.areas.includes(a)?p.areas.filter(x=>x!==a):[...p.areas,a]}))} style={{background:novoConsultor.areas.includes(a)?(COR_AREA[a]||"#3b82f6"):"#f1f5f9",color:novoConsultor.areas.includes(a)?"#fff":"#475569",border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Status</label>
              <select value={novoConsultor.status} onChange={e=>setNovoConsultor(p=>({...p,status:e.target.value}))} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13}}>
                <option value="ativo">✅ Ativo</option><option value="inativo">⏸ Inativo</option>
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:4}}>Observação</label>
              <textarea value={novoConsultor.obs} onChange={e=>setNovoConsultor(p=>({...p,obs:e.target.value}))} rows={2} style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowModalConsultor(false);setEditConsultor(null);}} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={saveConsultor} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700}}>Salvar no Firebase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
