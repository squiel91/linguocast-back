ALTER TABLE episodes ADD COLUMN sourceId TEXT NOT NULL;

CREATE TABLE reproductions (
  episodeId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  leftOn INTEGER,
  completedAt DATETIME,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, episodeId)
);

CREATE TRIGGER reproductionsUpdatedByTrigger AFTER UPDATE ON reproductions
FOR EACH ROW BEGIN
    UPDATE reproductions
    SET updatedAt = CURRENT_TIMESTAMP
    WHERE episodeId = NEW.episodeId AND userId = NEW.userId;
END;
