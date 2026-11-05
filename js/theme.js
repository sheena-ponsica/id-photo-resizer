const themeMedia=window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme(){
  return localStorage.getItem('id-tools-theme');
}

function currentTheme(){
  return savedTheme() || (themeMedia.matches?'dark':'light');
}

function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  const button=document.getElementById('theme-toggle');
  if(button){
    const dark=theme==='dark';
    button.textContent=dark?'☀️':'🌙';
    button.title=dark?'Switch to light mode':'Switch to dark mode';
    button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-pressed',String(dark));
  }
}

applyTheme(currentTheme());

document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('.nav');
  if(!nav)return;
  const actions=document.createElement('div');
  actions.className='nav-actions';
  const button=document.createElement('button');
  button.id='theme-toggle';
  button.className='theme-toggle';
  button.type='button';
  button.onclick=()=>{
    const theme=currentTheme()==='dark'?'light':'dark';
    localStorage.setItem('id-tools-theme',theme);
    applyTheme(theme);
  };
  actions.appendChild(button);
  nav.appendChild(actions);
  applyTheme(currentTheme());
});
