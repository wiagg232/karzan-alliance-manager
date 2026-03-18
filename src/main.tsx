import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@app/App';
import './index.css';
import '@shared/i18n';
import { initGA } from '@/analytics';
import { supabase } from '@/shared/api/supabase';

initGA();

const handleOAuthHash = async () => {
  const hash = window.location.hash;
  if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
    // 強制 Supabase 處理這個 hash
    const { data, error } = await supabase.auth.getSession();

    // 處理完後，把 Hash 清除，避免干擾 HashRouter
    // 或是將其改為 HashRouter 能接受的格式，例如 /#/ 
    window.location.hash = '/';
  }
};

handleOAuthHash().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

