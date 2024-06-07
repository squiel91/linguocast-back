
CREATE TABLE commentsTemp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  resourceType VARCHAR(32), -- 'podcast' | 'episode'
  resourceId INTEGER NOT NULL,
  content TEXT NOT NULL,
  responseTo INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Should add the corresponding FOREIGN KEY triggers

CREATE TABLE commentsLike (
  userId
  type:  VARCHAR(64) -- 'episodeLike' | 'commentLike' | 'commentDislike' | 
  resourceId:
  reactionType: 'LIKE' | 'DISLIKE'
)


-- Migrate data

DROP TABLE comments;

-- rename comentsTemp to comments

CREATE TRIGGER commentsUpdatedByTrigger AFTER UPDATE ON comments
FOR EACH ROW BEGIN
    UPDATE comments
    SET updatedAt = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;


