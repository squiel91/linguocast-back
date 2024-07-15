CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password VARCHAR(256),
  isProfilePrivate BOOLEAN NOT NULL DEFAULT FALSE,
  isPremium BOOLEAN NOT NULL DEFAULT FALSE, level VARCHAR(32),
  learningLanguageId INTEGER, avatar TEXT,
  canOthersContact BOOLEAN NOT NULL DEFAULT FALSE,
  languageVariant VARCHAR(64),
  isAdmin BOOLEAN NOT NULL DEFAULT FALSE
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(64) NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  coverImage VARCHAR(256),
  levels JSON,
  links JSON,
  targetLanguageId INTEGER,
  mediumLanguageId INTEGER,
  episodeCount INTEGER,
  isActive BOOLEAN,
  since DATETIME,
  hasVideo BOOLEAN,
  avarageEpisodeMinutesDuration INTEGER,
  hasTranscript BOOLEAN,
  isTranscriptFree BOOLEAN,
  uploadedByUserId INTEGER NOT NULL,
  byUserId INTEGER NOT NULL DEFAULT 1,
  isDeleted BOOLEAN NOT NULL DEFAULT FALSE,
  isPremium BOOLEAN NOT NULL DEFAULT FALSE,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  rss VARCHAR(256), lastModified VARCHAR(128),
  eTag VARCHAR(512), isListed BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (targetLanguageId) REFERENCES languages(id),
  FOREIGN KEY (mediumLanguageId) REFERENCES languages(id),
  FOREIGN KEY (uploadedByUserId) REFERENCES users(id)
);

CREATE TABLE savedPodcasts (
    userId INTEGER NOT NULL,
    podcastId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (podcastId) REFERENCES podcasts(id),
    UNIQUE(userId, podcastId)
);

CREATE TABLE episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  podcastId INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  duration INTEGER NOT NULL,
  description TEXT,
  contentUrl TEXT NOT NULL,
  publishedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, transcript TEXT, isListed BOOLEAN NOT NULL DEFAULT FALSE, sourceId TEXT, isDeleted BOOLEAN NOT NULL DEFAULT FALSE, isPremium BOOLEAN NOT NULL DEFAULT FALSE, isFromRss BOOLEAN NOT NULL DEFAULT FALSE);

CREATE TABLE reproductions (
  episodeId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  leftOn INTEGER,
  completedAt DATETIME,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, episodeId)
);

CREATE TABLE episodePipeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episodeId INTEGER NOT NULL,
  stage VARCHAR(64) NOT NULL,
  result JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (episodeId) REFERENCES episodes(id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  resourceType VARCHAR(32), -- 'podcast' | 'episode'
  resourceId INTEGER NOT NULL,
  content TEXT NOT NULL,
  responseTo INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcriptCache (
  audioUrl TEXT PRIMARY KEY NOT NULL,
  language VARCHAR(64),
  result JSON NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episodeId INTEGER NOT NULL,
  -- isGraded BOOLEAN DEFAULT TRUE NOT NULL,
  -- isAutomaticallyCreated BOOLEAN FALSE NOT NULL,
  -- model VARCHAR(64), -- only if automatically created
  -- isRevised BOOLEAN DEFAULT TRUE NOT NULL,
  content JSON NOT NULL, -- the exercise itself
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, start INTEGER, duration INTEGER,
  FOREIGN KEY (episodeId) REFERENCES episodes(id)
);

CREATE TABLE embeddeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episodeId INTEGER NOT NULL,
  type VARCHAR(32) NOT NULL, -- image / note / link / episode
  content JSON NOT NULL,
  start INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 15,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dictionary (
  id INTEGER PRIMARY KEY NOT NULL,
  languageId INTEGER NOT NULL,
  image VARCHAR(512),
  word VARCHAR(32),
  pronunciation VARCHAR(64),
  definitions JSON,
  FOREIGN KEY (languageId) REFERENCES languages(id)
);

CREATE TABLE measureWords (
  wordId id INTEGER NOT NULL,
  measureWordId INTEGER NOT NULL,
  FOREIGN KEY (wordId) REFERENCES dictionary(id),
  FOREIGN KEY (measureWordId) REFERENCES dictionary(id),
  UNIQUE(wordId, measureWordId)
);

CREATE TABLE userWords (
  userId INTEGER NOT NULL,
  wordId INTEGER NOT NULL,
  reviewScheduledFor INTEGER NOT NULL,
  lastReviewInterval INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
  FOREIGN KEY (wordId) REFERENCES dictionary(id)
  UNIQUE(userId, wordId)
);

CREATE TABLE dailyActivity (
  userId INTEGER NOT NULL,
  wordsAddedCount INTEGER NOT NULL DEFAULT 0,
  wordsReviewedCount INTEGER NOT NULL DEFAULT 0,
  day INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
  UNIQUE(userId, day)
);

CREATE TABLE exerciseResponses (
  userId INTEGER NOT NULL,
  exerciseId INTEGER NOT NULL,
  response TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (exerciseId) REFERENCES exercises(id),
  UNIQUE(userId, exerciseId)
);

CREATE TRIGGER reproductionsUpdatedByTrigger AFTER UPDATE ON reproductions
FOR EACH ROW BEGIN
    UPDATE reproductions
    SET updatedAt = CURRENT_TIMESTAMP
    WHERE episodeId = NEW.episodeId AND userId = NEW.userId;
END;

CREATE TRIGGER commentsUpdatedByTrigger AFTER UPDATE ON comments
FOR EACH ROW BEGIN
    UPDATE comments
    SET updatedAt = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;