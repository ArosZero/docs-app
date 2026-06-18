CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  current_version_id INTEGER
);

CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id),
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, version_number)
);

-- Seed: 1 tài liệu mẫu + phiên bản đầu tiên
INSERT INTO documents (slug, title) VALUES ('gioi-thieu', 'Giới thiệu');
INSERT INTO document_versions (document_id, version_number, content, author)
VALUES (1, 1, '# Xin chào

Đây là tài liệu đầu tiên. Bấm **Sửa** để thay đổi nội dung.', 'system');
UPDATE documents SET current_version_id = 1 WHERE id = 1;