'use strict';

var _dbSaveLoad = require('./dbSaveLoad');

// database is let instead of const to allow us to modify it in test.js
var database = {
  users: {},
  articles: {},
  comments: {},
  nextArticleId: 1,
  nextCommentId: 1
};

var routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function getUser(url, request) {
  var username = url.split('/').filter(function (segment) {
    return segment;
  })[1];
  var user = database.users[username];
  var response = {};

  if (user) {
    var userArticles = user.articleIds.map(function (articleId) {
      return database.articles[articleId];
    });
    var userComments = user.commentIds.map(function (commentId) {
      return database.comments[commentId];
    });
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  var username = request.body && request.body.username;
  var response = {};
  if (database.users[username]) {
    response.body = { user: database.users[username] };
    response.status = 200;
  } else if (username) {
    var user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = { user: user };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  var response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles).map(function (articleId) {
      return database.articles[articleId];
    }).filter(function (article) {
      return article;
    }).sort(function (article1, article2) {
      return article2.id - article1.id;
    })
  };

  return response;
}

function getArticle(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var article = database.articles[id];
  var response = {};

  if (article) {
    article.comments = article.commentIds.map(function (commentId) {
      return database.comments[commentId];
    });

    response.body = { article: article };
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  var requestArticle = request.body && request.body.article;
  var response = {};
  if (requestArticle && requestArticle.title && requestArticle.url && requestArticle.username && database.users[requestArticle.username]) {
    var article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = { article: article };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var savedArticle = database.articles[id];
  var requestArticle = request.body && request.body.article;
  var response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = { article: savedArticle };
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var savedArticle = database.articles[id];
  var response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(function (commentId) {
      var comment = database.comments[commentId];
      database.comments[commentId] = null;
      var userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    var userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var username = request.body && request.body.username;
  var savedArticle = database.articles[id];
  var response = {};
  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = { article: savedArticle };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var username = request.body && request.body.username;
  var savedArticle = database.articles[id];
  var response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = { article: savedArticle };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

function createComment(url, request) {
  var requestComment = request.body && request.body.comment;
  var response = {};

  if (requestComment && requestComment.body && requestComment.username && requestComment.articleId && database.users[requestComment.username] && database.articles[requestComment.articleId]) {
    var comment = {
      id: database.nextCommentId++,
      articleId: requestComment.articleId,
      body: requestComment.body,
      username: requestComment.username,
      upvotedBy: [],
      downvotedBy: []
    };

    database.comments[comment.id] = comment;
    database.articles[comment.articleId].commentIds.push(comment.id);
    database.users[comment.username].commentIds.push(comment.id);

    response.body = { comment: comment };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateComment(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var savedComment = database.comments[id];
  var requestComment = request.body && request.body.comment;
  var response = {};

  if (!id || !requestComment) {
    response.status = 400;
  } else if (!savedComment) {
    response.status = 404;
  } else {
    savedComment.body = requestComment.body || savedComment.body;

    response.body = { comment: savedComment };
    response.status = 200;
  }

  return response;
}

function deleteComment(url, request) {
  var id = Number(url.split('/')[2]);
  var comment = database.comments[id];
  var response = {};

  if (comment && database.users[comment.username]) {
    // remove comment id from user's commentIds
    database.users[comment.username].commentIds.splice(database.users[comment.username].commentIds.indexOf(id), 1);
    // remove comment id from article's commentIds
    database.articles[comment.articleId].commentIds.splice(database.articles[comment.articleId].commentIds.indexOf(id), 1);
    // set comment to null
    database.comments[id] = null;
    response.status = 204;
  } else {
    response.status = 404;
  }

  return response;
}

function upvoteComment(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var username = request.body && request.body.username;
  var savedComment = database.comments[id];
  var response = {};

  if (savedComment && database.users[username]) {
    savedComment = upvote(savedComment, username);

    response.body = { comment: savedComment };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteComment(url, request) {
  var id = Number(url.split('/').filter(function (segment) {
    return segment;
  })[1]);
  var username = request.body && request.body.username;
  var savedComment = database.comments[id];
  var response = {};

  if (savedComment && database.users[username]) {
    savedComment = downvote(savedComment, username);

    response.body = { comment: savedComment };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

// Write all code above this line.

var http = require('http');
var url = require('url');

var port = process.env.PORT || 4000;
var isTestMode = process.env.IS_TEST_MODE;

var requestHandler = function requestHandler(request, response) {
  var url = request.url;
  var method = request.method;
  var route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', null);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    var methodResponse = routes[route][method].call(null, url);
    !isTestMode && typeof _dbSaveLoad.saveDatabase === 'function' && (0, _dbSaveLoad.saveDatabase(database))();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    var body = [];
    request.on('data', function (chunk) {
      body.push(chunk);
    }).on('end', function () {
      body = JSON.parse(Buffer.concat(body).toString());
      var jsonRequest = { body: body };
      var methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && typeof _dbSaveLoad.saveDatabase === 'function' && (0, _dbSaveLoad.saveDatabase(database))();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

var getRequestRoute = function getRequestRoute(url) {
  var pathSegments = url.split('/').filter(function (segment) {
    return segment;
  });

  if (pathSegments.length === 1) {
    return '/' + pathSegments[0];
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return '/' + pathSegments[0] + '/:id/' + pathSegments[2];
  } else if (pathSegments[0] === 'users') {
    return '/' + pathSegments[0] + '/:username';
  } else {
    return '/' + pathSegments[0] + '/:id';
  }
};

if (typeof _dbSaveLoad.loadDatabase === 'function' && !isTestMode) {
  var savedDatabase = (0, _dbSaveLoad.loadDatabase)();
  if (savedDatabase) {
    for (var key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

var server = http.createServer(requestHandler);

server.listen(port, function (err) {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log('Server is listening on ' + port);
});
