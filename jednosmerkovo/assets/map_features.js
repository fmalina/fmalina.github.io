
// helpers
const zranenia=p=>[
    +p.Osoby_ZranBezPocet&&`${p.Osoby_ZranBezPocet} vôbec`,
    +p.Osoby_ZranLahkoPocet&&`${p.Osoby_ZranLahkoPocet} ľahko`,
    +p.Osoby_ZranTazkoPocet&&`${p.Osoby_ZranTazkoPocet} ťažko`,
    +p.Osoby_ZranUsmrtenaPocet&&`${p.Osoby_ZranUsmrtenaPocet} smrť`,
].filter(Boolean).join(', ');

const dni={"01":"Pondelok","02":"Utorok","03":"Streda",
    "04":"Štvrtok","05":"Piatok","06":"Sobota","07":"Nedeľa"};
const pohlavia={"1":"žena","2":"muž","0":"nezistené"};

// incidents
L.geoJSON(incidents,{
pointToLayer:(f,latlng)=>{
    const p=f.properties;

    const dead=+p.Osoby_ZranUsmrtenaPocet>0,
          severe=+p.Osoby_ZranTazkoPocet>0,
          light=+p.Osoby_ZranLahkoPocet>0;

    const color=dead?C.black:severe?C.darkRed:light?C.red:C.green;
    const radius=dead?7:severe?6:5;

    const driver=p.Vinnik_Vodic==="1";

    return L.circleMarker(latlng,{
        radius,
        fillColor:color,
        fillOpacity:.8,
        color:driver?0:C.white,
        weight:driver?0:2,
        opacity:1
    });
},

onEachFeature:(f,l)=>{
    const p=f.properties,dt=new Date(p.VerzeDatumCasDo);

    const noVinnik=[p.Vinnik_Vodic,p.Vinnik_Chodec,p.Vinnik_Cyklista,
        p.Vinnik_Spolujazdec,p.Vinnik_Alkohol,p.Vinnik_NavLatka].every(v=>v!=="1");

    l.bindPopup(
        `<b>Nehoda:</b>
            ${dni[p.DenVTyzdni]} ${dt.toLocaleDateString('sk-SK')} o
            ${dt.toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'})}<br>
        <b>Škoda:</b> ${+p.Veci_Skoda|0}€<br>
        <b>Vina:</b>
            ${noVinnik?'nezrejmé, ':''}
            ${p.Vinnik_Vodic==="1"?'vodič, ':''}
            ${p.Vinnik_Chodec==="1"?'chodec, ':''}
            ${p.Vinnik_Cyklista==="1"?'cyklista, ':''}
            ${p.Vinnik_Spolujazdec==="1"?'spolujazdec, ':''}
            ${p.Vinnik_Alkohol==="1"?'alkohol, ':''}
            ${p.Vinnik_NavLatka==="1"?'drogy, ':''}
            ${pohlavia[p.Vinnik_KodNdnPohlavi]} ${p.Vinnik_Vek||''} rokov<br>
        <b>Ranený:</b> ${p.Osoby_Pocet} (${zranenia(p)})<br>
        <small><code>poradie: ${p.Poradi}</code></small>`
    );
}
}).addTo(map);

// oneways
const vals=oneways.features.map(f=>+f.properties.circuity).filter(v=>v>=0),
      min=Math.min(...vals),
      max=Math.min(Math.max(...vals),2000);

const getColor=v=>{
    if(v<0) return C.gray;
    const r=(Math.min(v,max)-min)/(max-min||1);
    return `hsl(${45-r*30},${70+r*30}%,${70-r*65}%)`;
};

L.geoJSON(oneways,{
    style:f=>({color:getColor(+f.properties.circuity),weight:4,opacity:.9}),
    onEachFeature:(f,l)=>{
        const p=f.properties,v=+p.circuity|0;

        l.bindPopup(`<b>Cena obchádzky:</b> ${v} m<br>
            <small><code>${p.highway}, osmid:${p.osmid}</code></small>`);
        l.bindTooltip(`${v} m`,{direction:'center',className:'circuity-label'});
    }
}).addTo(map);