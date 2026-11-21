const C={red:'#f64740',darkRed:'#a3333d',green:'#c4d6b0',blue:'#477998',
    lightGray:'#e0e0e0',gray:'#999',black:'#291f1e',white:'#fff'};

// map
const map=L.map('map').setView(latlon,12);
map.attributionControl.setPrefix(false);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_2qsm_1_6fb01d771c669f0f8dfaa74f', {
    attribution:
      '© <a href="https://www.openstreetmap.org">OSM</a> ' +
      '© <a href="https://carto.com/">CARTO</a>'}
).addTo(map);

// restore map state (if exists)
const saved = localStorage.getItem('mapState');
if (saved) {
    const { lat, lng, zoom } = JSON.parse(saved);
    map.setView([lat, lng], zoom);
    localStorage.removeItem('mapState'); // optional
}

function saveMapState() {
    const c = map.getCenter();
    let state = {lat: c.lat,lng: c.lng,zoom: map.getZoom()};
    localStorage.setItem('mapState', JSON.stringify(state));
}
function getTooltip(s) {
    return `
        <b>${s.name}</b> ${s.population} obyvateľov, ${s.total_accidents} dopravných nehôd<br>
        ${s.accs_per_1k} nehody (${s.hard_per_1k} ťažké) na 1000 obyvateľov<br>
        Podiel ťažkých nehôd: ${(s.hard * 100).toFixed(1)} %<br>
        Alkohol: ${s.alko_pct} % (${s.alko} nehôd z toho ${s.fem_alko} ženy)<br>
        Drogy: ${s.drogy_pct} %<br>
        Priemerná škoda: €${s.avg_price}
    `;
}
function getColorHard(v) {
    return v > 1.2 ? C.black :
           v > 0.9 ? C.darkRed :
           v > 0.6 ? C.red :
           v > 0.4 ? 'darkgoldenrod' :
           v > 0.25 ? 'goldenrod' :
                      'gold';
}

// districts
const bounds=[];
fetch('assets/districts.json')
.then(r=>r.json())
.then(districts=>{
    Object.entries(districts).forEach(([i_slug,d])=>{
        const m=L.marker(d.latlon,{icon:L.divIcon({
            className:'district-label',html:`<span>&bull; ${d.name}</span>`})}).addTo(map);
        const navigate = () => {if(!home) saveMapState();location.href = i_slug;}
        let color = C.red;
        let tooltip = d.name;
        let opacity = 0.1;
        if(districtStats!==0) {
            const stats = districtStats[i_slug];
            color = getColorHard(stats.hard_per_1k);
            tooltip = getTooltip(stats);
            opacity = 0.5;
        }

        m.on('click', navigate);
        bounds.push(d.latlon);
        if (slug !== i_slug){
            const latlngs = d.polygon.map(ring => ring.map(([lon, lat]) => [lat, lon])); // swap
            const polygon = L.polygon(latlngs, { color: color, weight: 1, fillOpacity: opacity }).addTo(map);
            polygon.bindTooltip(tooltip, {sticky: true});
            polygon.on('click', navigate);
            const el = m.getElement();
            const mouseover = () => {
                polygon.setStyle({ color: color, fillOpacity: opacity + 0.2 });
                m.setZIndexOffset(1000)
                if (el) el.classList.add('hover');}
            const mouseout = () => {
                polygon.setStyle({ color: color, fillOpacity: opacity });
                m.setZIndexOffset(0)
                if (el) el.classList.remove('hover');}
            polygon.on('mouseover', mouseover);
            polygon.on('mouseout', mouseout);
            m.on('mouseover', mouseover);
            m.on('mouseout', mouseout);
        }
    });
    if (home && !saved && bounds.length) {
        map.fitBounds(bounds);
    }
});
