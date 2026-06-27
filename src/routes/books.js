const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /books
// Return all books. Optional query param: ?author_id=<id>
router.get('/', (req, res) => {
  let books;
  if (req.query.author_id) {
    books = db.prepare('SELECT * FROM books WHERE author_id = ?').all(req.query.author_id);
  } else {
    books = db.prepare('SELECT * FROM books').all();
  }
  
  const authorStmt = db.prepare('SELECT * FROM authors WHERE id = ?');
  const booksWithAuthors = books.map(book => ({
    ...book,
    author: authorStmt.get(book.author_id)
  }));
  
  res.json(booksWithAuthors);
});

// GET /books/:id
// Return a single book including its author info. 404 if not found.
router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(book.author_id);
  res.json({ ...book, author });
});

// POST /books
// Create a new book. Body: { title, year?, author_id }
// Respond 201 with the created book. 404 if author_id does not exist.
router.post('/', (req, res) => {
  const { title, year, author_id } = req.body;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(author_id);
  if (!author) return res.status(404).json({ error: 'Author not found' });

  const stmt = db.prepare('INSERT INTO books (title, year, author_id) VALUES (?, ?, ?)');
  const info = stmt.run(title, year || null, author_id);
  
  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newBook);
});

// PATCH /books/:id
// Update title, year, or author_id. Body: { title?, year?, author_id? }
// Respond 200 with the updated book. 404 if not found.
router.patch('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });

  const title = req.body.title !== undefined ? req.body.title : book.title;
  const year = req.body.year !== undefined ? req.body.year : book.year;
  const author_id = req.body.author_id !== undefined ? req.body.author_id : book.author_id;

  if (req.body.author_id !== undefined) {
    const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(author_id);
    if (!author) return res.status(404).json({ error: 'Author not found' });
  }

  db.prepare('UPDATE books SET title = ?, year = ?, author_id = ? WHERE id = ?').run(title, year, author_id, req.params.id);
  
  const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updatedBook);
});

// DELETE /books/:id
// Delete a book. 204 on success. 404 if not found.
router.delete('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

module.exports = router;
