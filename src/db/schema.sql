CREATE TABLE languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(64) NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password VARCHAR(256),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  coverImage VARCHAR(256),
  levels JSON,
  links JSON,
  targetLanguageId INTEGER NOT NULL,
  mediumLanguageId INTEGER,
  episodeCount INTEGER,
  isActive BOOLEAN,
  since DATETIME,
  hasVideo BOOLEAN,
  avarageEpisodeMinutesDuration INTEGER,
  hasTranscript BOOLEAN,
  isTranscriptFree BOOLEAN,
  uploadedByUserId INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
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

CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    podcastId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    comment TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (podcastId) REFERENCES podcasts(id)
);
