/*
  STATICKÁ VERZIA
  ---------------
  assets/availability.json je generovaný Python cronjobom.
  Formulár zatiaľ POSTuje na /api/booking. Ak endpoint neexistuje,
  stránka zobrazí údaje, ktoré treba poslať.

  availability.json:
  {
    "updatedAt": "2026-08-15T12:00:00+02:00",
    "booked": ["2026-08-20", "2026-08-21"],
    "pricePerNight": 80
  }
*/
const state = {
  month: new Date(),
  checkIn: null,
  checkOut: null,
  data: {booked: [], pricePerNight: 80}
};

const fmt = new Intl.DateTimeFormat("sk-SK", {day:"numeric", month:"numeric", year:"numeric"});
const eur = new Intl.NumberFormat("sk-SK", {style:"currency", currency:"EUR", maximumFractionDigits:0});

async function loadAvailability(){
  try {
    const r = await fetch("availability.json", {cache:"no-store"});
    if(r.ok) state.data = await r.json();
  } catch(e) {
    console.info("Použitá lokálna/default dostupnosť.");
  }
  renderCalendar();
}
function iso(d){return d.toISOString().slice(0,10)}
function same(a,b){return a && b && iso(a)===iso(b)}
function blocked(d){return state.data.booked.includes(iso(d))}
function inRange(d){
  return state.checkIn && state.checkOut && d>state.checkIn && d<state.checkOut;
}
function canSelect(d){
  if(blocked(d)) return false;
  if(!state.checkIn) return true;
  if(state.checkIn && !state.checkOut){
    const start = new Date(state.checkIn);
    for(let x=new Date(start); x<d; x.setDate(x.getDate()+1)) if(blocked(x)) return false;
    return d>state.checkIn;
  }
  return true;
}
function renderCalendar(){
  const title=document.getElementById("monthTitle"), days=document.getElementById("days");
  const y=state.month.getFullYear(), m=state.month.getMonth();
  title.textContent=new Intl.DateTimeFormat("sk-SK",{month:"long",year:"numeric"}).format(new Date(y,m,1));
  days.innerHTML="";
  let first=new Date(y,m,1), offset=(first.getDay()+6)%7;
  for(let i=0;i<offset;i++) days.appendChild(document.createElement("span"));
  const total=new Date(y,m+1,0).getDate();
  for(let n=1;n<=total;n++){
    const d=new Date(y,m,n); const b=document.createElement("button");
    b.type="button"; b.className="day"; b.textContent=n;
    b.disabled=blocked(d) || !canSelect(d);
    if(blocked(d)) b.classList.add("booked");
    if(same(d,state.checkIn)||same(d,state.checkOut)) b.classList.add("selected");
    if(inRange(d)) b.classList.add("in-range");
    b.addEventListener("click",()=>selectDay(d));
    days.appendChild(b);
  }
}
function selectDay(d){
  if(!state.checkIn || state.checkOut){ state.checkIn=new Date(d); state.checkOut=null; }
  else if(d>state.checkIn){ state.checkOut=new Date(d); }
  else { state.checkIn=new Date(d); state.checkOut=null; }
  updateSelection(); renderCalendar();
}
function nights(){
  if(!state.checkIn||!state.checkOut) return 0;
  return Math.round((state.checkOut-state.checkIn)/86400000);
}
function updateSelection(){
  document.getElementById("checkInLabel").textContent=state.checkIn?fmt.format(state.checkIn):"—";
  document.getElementById("checkOutLabel").textContent=state.checkOut?fmt.format(state.checkOut):"—";
  const n=nights();
  document.getElementById("price").textContent=n?eur.format(n*state.data.pricePerNight):"Vyberte termín";
}
document.getElementById("prevMonth").onclick=()=>{state.month.setMonth(state.month.getMonth()-1);renderCalendar()};
document.getElementById("nextMonth").onclick=()=>{state.month.setMonth(state.month.getMonth()+1);renderCalendar()};

document.getElementById("bookingForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const status=document.getElementById("formStatus");
  if(!state.checkIn||!state.checkOut){status.textContent="Najprv vyberte dátum príchodu a odchodu.";return}
  if(nights()<1){status.textContent="Pobyt musí trvať aspoň jednu noc.";return}
  const data=Object.fromEntries(new FormData(e.target));
  const payload={...data,checkIn:iso(state.checkIn),checkOut:iso(state.checkOut),nights:nights(),price:nights()*state.data.pricePerNight};
  try{
    const r=await fetch("/api/booking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(!r.ok) throw new Error();
    status.textContent="Rezervácia bola odoslaná. Skontrolujte si e-mail.";
    e.target.reset();
  }catch(err){
    // statický fallback: pripravené pre nasadenie backendu
    status.textContent="Rezervačný server ešte nie je pripojený. Termín: "+fmt.format(state.checkIn)+" – "+fmt.format(state.checkOut)+".";
    console.log("BOOKING PAYLOAD",payload);
  }
});
loadAvailability();
