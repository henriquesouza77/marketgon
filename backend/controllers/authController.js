const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');

// Função auxiliar para converter DD/MM/YYYY -> YYYY-MM-DD
function formatarDataParaMySQL(dataStr) {
  if (!dataStr || typeof dataStr !== 'string' || dataStr.trim() === '') return null;
  
  // Se estiver no formato BR com barras (05/03/2010)
  if (dataStr.includes('/')) {
    const partes = dataStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, ano] = partes;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  }
  return dataStr; // Retorna normal caso já venha YYYY-MM-DD
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe email e senha.' });
    }

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = rows[0];
    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const secretKey = process.env.JWT_SECRET || 'chave_secretamarketgon_2026';

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
      secretKey,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    return res.status(500).json({ erro: 'Erro ao efetuar login.' });
  }
}

// POST /api/auth/cadastro
async function cadastro(req, res) {
  try {
    const { nome, email, senha, cpf, data_nascimento } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
    }

    const [existente] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existente.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma conta com este email.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const cpfValor = cpf && cpf.trim() !== '' ? cpf : null;
    const dataNascValor = formatarDataParaMySQL(data_nascimento);

    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo, cpf, data_nascimento) VALUES (?, ?, ?, "cliente", ?, ?)',
      [nome, email, senhaHash, cpfValor, dataNascValor]
    );

    return res.status(201).json({ id: resultado.insertId, nome, email });
  } catch (erro) {
    console.error('Erro detalhado no cadastro:', erro);
    return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
}

module.exports = { login, cadastro };