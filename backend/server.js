require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./database/db');

const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require('./routes/pedidos');

const app = express();

app.use(cors());
app.use(express.json());

// --- IMPORTAÇÃO INTELIGENTE DO ARQUIVO SQL ---
async function executarArquivoSQL() {
  try {
    // 1. Verifica se a tabela "produtos" já existe na Aiven
    const [tabelas] = await pool.query("SHOW TABLES LIKE 'produtos'");
    
    if (tabelas.length > 0) {
      console.log('⚡ As tabelas já existem no banco da Aiven. Ppulando importação.');
      return;
    }

    // 2. Se a tabela não existir, lê e executa o mercearia_gon.sql
    const caminhoSql = path.join(__dirname, 'mercearia_gon.sql'); 
    
    if (fs.existsSync(caminhoSql)) {
      const sql = fs.readFileSync(caminhoSql, 'utf8');
      await pool.query(sql);
      console.log('✅ Banco de dados Aiven populado com sucesso a partir do mercearia_gon.sql!');
    } else {
      console.log('⚠️ Arquivo mercearia_gon.sql não encontrado na pasta backend.');
    }
  } catch (error) {
    console.error('❌ Erro ao executar o arquivo SQL:', error.message);
  }
}

// Executa a verificação/importação na inicialização
executarArquivoSQL();

// --- API ---
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);

// --- Frontend estático ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Rota curinga
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Market Gon rodando em http://localhost:${PORT}🚀🚀`);
});