function ads() {
    var ext = document.createElement("script");
    ext.setAttribute('async','async');
    ext.src = "//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    document.body.appendChild(ext);

    var ins = document.createElement("ins");
    ins.setAttribute('class','adsbygoogle');
    ins.setAttribute('style','display:block;');
    ins.setAttribute('data-ad-client','ca-pub-7258089185308476');
    ins.setAttribute('data-ad-slot','3832684967');
    ins.setAttribute('data-ad-format','auto');
    ins.setAttribute('data-full-width-responsive','true');
    const h1 = document.querySelector('h1');
    if (h1) h1.after(ins);
    else document.body.appendChild(ins);


    var inl = document.createElement("script");
    inl.text = '(adsbygoogle = window.adsbygoogle || []).push({});'
    document.body.appendChild(inl);
}

window.onload = function () {
    ads();
}
