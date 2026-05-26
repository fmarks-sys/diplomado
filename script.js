const tit = document.querySelector('.title');

// tit.style.backgroundColor = 'aliceblue';
const dark = document.body;

const botonTheme = document.querySelector('.btn');

botonTheme.addEventListener('click', function() {
    // tit.style.backgroundColor = 'aliceblue';
    dark.classList.toggle('modo-oscuro'); // Alternar (si está la quita, si no, la pone)
    tit.classList.toggle('darktitle');
    alert("modo oscuro activado")
})