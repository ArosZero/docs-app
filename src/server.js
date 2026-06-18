const express = require('express');
const path = require('path');
const MarkdownIt = require('markdown-it');
const sanitizeHtml = require('sanitize-html');
const pool = require('./db');

const app = express();
const md = new MarkdownIt();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

async function getDoc(slug) {
  const r = await pool.query('SELECT * FROM documents WHERE slug = $1', [slug]);
  return r.rows[0];
}
function render(markdown) {
  return sanitizeHtml(md.render(markdown), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img']),
    allowedAttributes: { a: ['href'], img: ['src', 'alt'] },
  });
}

app.get('/', async (req, res) => {
  const r = await pool.query('SELECT slug FROM documents ORDER BY id LIMIT 1');
  return r.rows[0] ? res.redirect('/' + r.rows[0].slug) : res.send('Chưa có tài liệu.');
});

app.get('/:slug', async (req, res) => {
  const doc = await getDoc(req.params.slug);
  if (!doc) return res.status(404).send('Không tìm thấy');
  const v = await pool.query('SELECT * FROM document_versions WHERE id = $1',
    [doc.current_version_id]);
  res.render('view', { doc, html: render(v.rows[0].content), version: v.rows[0] });
});

app.get('/:slug/edit', async (req, res) => {
  const doc = await getDoc(req.params.slug);
  if (!doc) return res.status(404).send('Không tìm thấy');
  const v = await pool.query('SELECT * FROM document_versions WHERE id = $1',
    [doc.current_version_id]);
  res.render('edit', { doc, content: v.rows[0].content });
});

app.post('/:slug', async (req, res) => {
  const doc = await getDoc(req.params.slug);
  if (!doc) return res.status(404).send('Không tìm thấy');
  const last = await pool.query(
    'SELECT MAX(version_number) AS n FROM document_versions WHERE document_id = $1',
    [doc.id]);
  const next = (last.rows[0].n || 0) + 1;
  const ins = await pool.query(
    `INSERT INTO document_versions (document_id, version_number, content, author)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [doc.id, next, req.body.content || '', req.body.author || 'khách']);
  await pool.query('UPDATE documents SET current_version_id = $1 WHERE id = $2',
    [ins.rows[0].id, doc.id]);
  res.redirect('/' + doc.slug);
});

app.get('/:slug/history', async (req, res) => {
  const doc = await getDoc(req.params.slug);
  if (!doc) return res.status(404).send('Không tìm thấy');
  const vs = await pool.query(
    `SELECT * FROM document_versions WHERE document_id = $1
     ORDER BY version_number DESC`, [doc.id]);
  res.render('history', { doc, versions: vs.rows });
});

app.get('/:slug/v/:n', async (req, res) => {
  const doc = await getDoc(req.params.slug);
  if (!doc) return res.status(404).send('Không tìm thấy');
  const v = await pool.query(
    'SELECT * FROM document_versions WHERE document_id = $1 AND version_number = $2',
    [doc.id, req.params.n]);
  if (!v.rows[0]) return res.status(404).send('Không có phiên bản này');
  res.render('view', { doc, html: render(v.rows[0].content), version: v.rows[0] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('App chạy ở cổng ' + PORT));