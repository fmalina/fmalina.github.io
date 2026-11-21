
const COLORS = {
    vinnik: [C.blue, C.green, C.red, C.darkRed, C.black, C.gray],
    gender: [C.blue, C.red, C.black],
    injuries: [C.green, C.red, C.darkRed, C.black],
    default: C.blue
};
const genders = {1:"zena",2:"muz",0:"nezname"};
const hourLabels = Array.from({length:24},(_,i)=>i.toString().padStart(2,'0'));
const spectrum=v=>
    v>0.3?C.black:
    v>0.15?C.darkRed:
    v>0.075?C.red:
    v>0.035?'darkgoldenrod':
    v>0.017?'goldenrod':
    'gold';
const $ = id => document.getElementById(id);
const tx = (id,txt) => $(id).textContent = txt;
const container = $("charts");
const createCanvas = id => Object.assign(document.createElement("canvas"),{id});
const addCanvas = id => container.appendChild(createCanvas(id));
const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 'N/A';
const makeChart = (id,type,labels,data,color,label='') =>
    new Chart(addCanvas(id),{type,data:{labels,datasets:[{data,label,backgroundColor:color}]}});

if(!stats) {
    stats = {
        vinnik:{vodic:0,chodec:0,cyklista:0,spolujazdec:0,alkohol:0,drogy:0},
        gender:{muz:0,zena:0,nezname:0},
        injuries:{bez:0,lahke:0,tazke:0,smrt:0},
        days:Array(7).fill(0),
        hours:Array(24).fill(0),
        age_bins:Array(10).fill(0),
        totalAccidents:0,totalDamage:0,
        ages:[],dates:[],daily:{}
    };
    const hours=Array.from({length:24},()=>({acc:0,alko:0,severe:0}));
    incidents.features.forEach(({properties:p}) => {
        stats.totalAccidents++;
        const dmg = Number(p.Veci_Skoda)||0;
        stats.totalDamage += dmg;

        // vinnik
        [["Vinnik_Vodic","vodic"],["Vinnik_Chodec","chodec"],["Vinnik_Cyklista","cyklista"],
        ["Vinnik_Spolujazdec","spolujazdec"],["Vinnik_Alkohol","alkohol"],["Vinnik_NavLatka","drogy"]]
        .forEach(([k,v]) => p[k]==="1" && stats.vinnik[v]++);

        // gender
        (genders)[p.Vinnik_KodNdnPohlavi] && stats.gender[genders[p.Vinnik_KodNdnPohlavi]]++;

        // day
        const d = +p.DenVTyzdni; d>=1 && d<=7 && stats.days[d-1]++;
        // hour
        const h=+p.KodStatDenCasAgr1H;
        if(h>=0&&h<24) {
            stats.hours[h]++;
            const o=hours[h];
            o.acc++;
            if(p.Vinnik_Alkohol==="1") o.alko++;
            if(+p.Osoby_ZranUsmrtenaPocet>0 || +p.Osoby_ZranTazkoPocet>0)
                o.severe++;
        }
        // injuries
        stats.injuries.bez   += +p.Osoby_ZranBezPocet||0;
        stats.injuries.lahke += +p.Osoby_ZranLahkoPocet||0;
        stats.injuries.tazke += +p.Osoby_ZranTazkoPocet||0;
        stats.injuries.smrt  += +p.Osoby_ZranUsmrtenaPocet||0;

        // age
        const age = +p.Vinnik_Vek; age>0 && stats.ages.push(age);

        // date + daily
        const date = new Date(p.VerzeDatumCasDo);
        if (!isNaN(date)) {
            stats.dates.push(date);
            const key = date.toISOString().slice(0,10);
            (stats.daily[key] ??= {count:0,damage:0});
            stats.daily[key].count++;
            stats.daily[key].damage += dmg;
        }
    });
    stats.ages.forEach(a => stats.age_bins[Math.min(a/10|0,9)]++);
    // TOTALS
    const minDate = new Date(Math.min(...stats.dates));
    const maxDate = new Date(Math.max(...stats.dates));
    tx('t-min', minDate.toLocaleDateString())
    tx('t-max', maxDate.toLocaleDateString())
    tx('t-acc', stats.totalAccidents.toLocaleString())
    tx('t-dmg', stats.totalDamage.toLocaleString())
    tx('t-smrt', stats.injuries.smrt)
    tx('t-rany', stats.injuries.lahke+stats.injuries.tazke)
    tx('t-bezo', stats.injuries.bez)
    tx('t-alko', (stats.vinnik.alkohol / stats.totalAccidents * 100).toFixed(1))
    tx('t-drog', (stats.vinnik.drogy   / stats.totalAccidents * 100).toFixed(1))
    tx('t-age', Math.round(avg(stats.ages)))
    // flatten
    stats.gender = Object.values(stats.gender)
    stats.injuries = Object.values(stats.injuries)
    // hodina vs závažnosť
    stats.points=hours.map((h,i)=>({
        x:i, y:(h.severe/h.acc||0)*100,
        r:Math.sqrt(h.acc)*1.5,
        alko:(h.alko/h.acc||0),
        acc:h.acc
    }));
}


makeChart('barVinnik','bar',
    ['Vodič','Chodec','Cyklista','Spolujazdec','Alkohol','Drogy'],
    Object.values(stats.vinnik), COLORS.vinnik,'Zavinil');

makeChart('barAge','bar',
    ['0-9','10-19','20-29','30-39','40-49','50-59','60-69','70-79','80-89','90+'],
    stats.age_bins, COLORS.default,'Vek vinníkov');

makeChart('barDays','bar',
    ['Po','Ut','St','Št','Pi','So','Ne'],
    stats.days, COLORS.default,'Nehôd na deň');
makeChart('barHours','bar',
    hourLabels,
    stats.hours, COLORS.default, 'Nehody podľa hodiny');

// scatter hodina vs závažnosť, farba = alkohol, veľkosť = počet nehôd
new Chart(addCanvas('scatterHours'), {type:'bubble',
    data:{datasets:[{data:stats.points,label:'farba = alkohol, veľkost = počet nehôd',
        backgroundColor:stats.points.map(p=>spectrum(p.alko))}]},
    options:{plugins:{tooltip:{callbacks:{label:ctx=>{
                const p=ctx.raw;
                return `${p.x}h: ${p.acc} nehôd, ${p.y.toFixed(1)}% vážne, ${(p.alko*100).toFixed(1)}% alkohol`;
            }}}},
    scales:{
        x:{title:{display:true,text:'Hodina dňa'},ticks:{stepSize:1}},
        y:{title:{display:true,text:'% vážnych nehôd'}}
}}});

// pie charts
makeChart('pieGender','pie',
    ['Muž','Žena','Neznáme'],
    stats.gender, COLORS.gender);

makeChart('pieInjury','pie',
    ['Bez zranení','Ľahké','Ťažké','Smrť'],
    stats.injuries, COLORS.injuries);


// MONTHLY
const monthly = {};
Object.entries(stats.daily).forEach(([d,v])=>{
    const k = d.slice(0,7);
    (monthly[k] ??= {count:0,damage:0});
    monthly[k].count+=v.count;
    monthly[k].damage+=v.damage;
});

const mKeys = Object.keys(monthly).sort();
const mCounts = mKeys.map(k=>monthly[k].count);
const mDamage = mKeys.map(k=>monthly[k].damage);
const mLabels = mKeys.map(k=>{
    const [y,m]=k.split('-');
    return new Date(y,m-1).toLocaleDateString('sk-SK',{month:'short',year:'numeric'});
});
const isYear = k => k.endsWith('-01');

// MAIN CHART
new Chart(addCanvas('lineMonthly'), {
    type:'line',
    data:{
        labels:mLabels,
        datasets:[
            {label:'Počet nehôd',data:mCounts,borderColor:C.blue,yAxisID:'y',tension:.3,pointRadius:3},
            {label:'Škoda (€)',data:mDamage,borderColor:C.red,yAxisID:'y1',tension:.3,pointRadius:3}
        ]
    },
    options:{
        interaction:{mode:'index',intersect:false},
        scales:{
            x:{
                ticks:{
                    callback:(v,i)=> mKeys[i].endsWith('-01') ? `\n${mKeys[i].slice(0,4)}` : mKeys[i].slice(5),
                    font:c=> isYear(mKeys[c.index]) ? {weight:'bold'} : {}
                },
                grid:{
                    color:c=> isYear(mKeys[c.index]) ? C.black : C.lightGray,
                    lineWidth:c=> isYear(mKeys[c.index]) ? 2 : 1
                }
            },
            y:{type:'linear',position:'left',beginAtZero:true,title:{display:true,text:'Počet nehôd'}},
            y1:{type:'linear',position:'right',beginAtZero:true,grid:{drawOnChartArea:false},
            title:{display:true,text:'Škoda (€)'}}
        }
    }
});

// Jednosmerkovo
if(oneways){
    const ow = oneways.features;
    let owLen=0,owCirc=0,owCount=0;
    ow.forEach(f=>{
        const p=f.properties,l=+p.length||0,c=+p.circuity||0;
        if(l<=0||c<0) return;
        owCount++;owLen+=l;owCirc+=c;
    });
    const owLenKm=owLen/1000;
    const owCircKm=owCirc/1000;
    const detourFactor=owCirc/owLen||0;
    const efficiency=owLen/(owLen+owCirc)||0;
    const avgDetour=owCirc/owCount||0;

    $('totals_oneways').innerHTML=`
    <h2>Jednosmerky</h2>
    <p><b>Segmenty</b> ${owCount.toLocaleString()}</p>
    <p><b>Dĺžka spolu</b> ${owLenKm.toFixed(2)} km</p>
    <p><b>Obchádzky</b> ${owCircKm.toFixed(2)} km</p>
    <p>v priemere ${avgDetour.toFixed(0)} m</p>
    <p><b>Efektivita</b> ${(efficiency*100).toFixed(1)}%</p>
    <p><b>Objazdíme</b> ${(detourFactor).toFixed(2)}×</p>
    `;
}

// sortable table
document.querySelectorAll(".sortable th").forEach((th, colIndex) => {
    let asc = true;

    th.addEventListener("click", () => {
        const table = th.closest("table");
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));

        // reset arrows
        table.querySelectorAll("th").forEach(h => {
            h.classList.remove("sort-asc", "sort-desc");
        });

        rows.sort((a, b) => {
            const A = a.children[colIndex].dataset.value;
            const B = b.children[colIndex].dataset.value;

            const numA = parseFloat(A);
            const numB = parseFloat(B);

            if (!isNaN(numA) && !isNaN(numB)) {
                return asc ? numA - numB : numB - numA;
            }
            return asc ? A.localeCompare(B) : B.localeCompare(A);
        });

        rows.forEach(tr => tbody.appendChild(tr));

        th.classList.add(asc ? "sort-asc" : "sort-desc");
        asc = !asc;
    });
});