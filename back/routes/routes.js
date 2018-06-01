const pgClient = require('../config/postgresql').pgClient;
const jwt = require('../config/requires').jwt;
const uuid = require('../config/requires').uuid;
const aws = require('../config/requires').aws;

//aws.config.loadFromPath('./config/awsCred.json');
aws.config.logger = console;
const s3 = new aws.S3();
aws.config.getCredentials( (err) => {
  if (err) console.log(err.stack);
  else console.log(aws.config.credentials.accessKeyId);
});
const bucket = 'clouderrelictestbucket';

async function locAuth(ctx) {
  if (ctx.request.body.email == undefined || ctx.request.body.password == undefined) {
    ctx.status = 400;
    ctx.body = {
      message: 'Missing required parameters: email and password',
      code: '7'
    };
    return -1;
  } else {
    let email = ctx.request.body.email;
    let password = ctx.request.body.password;
    let res = await pgClient.query('SELECT "password" FROM "public"."S3UserTable" WHERE "email" = $1', [email]);
    if (res.rowCount == 1) {
      let dbPass = res.rows[0].password;
      if (dbPass == password) {
        return email;
      } else {
        ctx.status = 401;
        ctx.body = {
          message: 'Not authenticated',
          code: '5'
        };
        return -1;
      }
    } else {
      ctx.status = 404;
      ctx.body = {
        message: 'Not found',
        code: '4'
      };
      return -1;
    }
  }
};

async function jwtAuth(ctx) {
  if (ctx.request.header.authorization == undefined) {
    ctx.status = 400;
    ctx.body = {
      message: 'Missing required parameter: token',
      code: '9'
    };
    return -1;
  };
  let tok = ctx.request.header.authorization.split(" ")[1];
    try {
      let decoded = jwt.verify(tok, 'mySecretTokenKey');
      res = await pgClient.query('SELECT "ID" FROM "public"."S3UserTable" WHERE "email" = $1', [decoded.email]);
      if (res.rowCount == 1) {
        user = {
          email: decoded.email,
          uID: res.rows[0].ID
        };
        return user;
      } else {
        ctx.status = 404;
        ctx.body = {
          message: 'Not found',
          code: '6'
        };
        return -1;
      }
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      console.log(err.name);
      ctx.body = {
        message: err.message,
        code: '8'
      }
      return -1;
    }
};

async function countFiles(prefix) {
  let params = {
    Bucket: bucket,
    Delimiter: '/',
    Prefix: prefix
  };
  let res = await s3.listObjects(params).promise();
  let size = 0;
  for (let i = 0; i < res.Contents.length; i++) {
    let fileKey = res.Contents[i].Key;
    fileKey = fileKey.split('/');
    if (fileKey[fileKey.length - 1] !== '') {
      size++;
    };
  };
  return size + res.CommonPrefixes.length;
};

async function getCode(key) {
  let res = await pgClient.query('SELECT "code" FROM "downCodes" WHERE "key" = $1', [key]);
  if (res.rowCount == 1) {
    return res.rows[0].code;
  } else {
    let code = uuid();
    res = pgClient.query('INSERT INTO "downCodes" ("code", "key") VALUES ($1, $2)', [code, key]);
    return code;
  };
};

async function getSize(sizeBytes) {
  let sizeStrings = ['bytes', 'KB', 'MB', 'GB'];
  let size = sizeBytes;
  let sizeStr = sizeStrings[0];
  let sizeStrInd = 0;
  while (size > 1024) {
    size = size / 1024;
    sizeStrInd++;
    sizeStr = sizeStrings[sizeStrInd];
  };
  return (Math.round(size * 10) / 10) + ' ' + sizeStr;
};

async function getSizeFromKey(key) {
  let params = {
    Bucket: bucket,
    Prefix: key
  };
  let res = await s3.listObjects(params).promise();
  if (res.Contents.length == 0) {
    return -1;
  };
  return getSize(res.Contents[0].Size);
};

async function parseRes(res) {
  let files = [];
  let content = res.Contents;
  for (let i = 0; i < content.length; i++) {
    let fileKey = content[i].Key;
    let fileCode = getCode(fileKey);
    let size = getSize(content[i].Size);
    fileKey = fileKey.split('/');
    if (fileKey[fileKey.length - 1] == '') {
      continue;
    };
    fileCode = await fileCode;
    files.push({
      name: fileKey[fileKey.length - 1],
      size: size,
      code: fileCode
    });
  }
  let prefixes = res.CommonPrefixes;
  let folders = [];
  let promArr = [];
  for (let i = 0; i < prefixes.length; i++) {
    let prefix = prefixes[i].Prefix;
    promArr.push(countFiles(prefix));
    prefixes[i] = prefix;
  };
  let promRes = await Promise.all(promArr);
  for (let i = 0; i < prefixes.length; i++) {
    let  prefix = prefixes[i].split('/');
    folders.push({
      name: prefix[prefix.length - 2],
      size: promRes[i]
    });
  };
  let response = {
    files: files,
    folders: folders
  };
  return response;
};

async function fileCopy(ctx, source, dest, uID) {
  if (dest.charAt(dest.length - 1) == '/') {
    dest = dest.substr(0, dest.length - 1);
  };
  if (dest == '') {
    ctx.status = 400;
    ctx.body = {
      message: 'Cannot be empty!',
      code: 23
    };
    return -1;
  };
  let params = {
    Bucket: bucket,
    Key: uID + '/' + source
  };
  try {
    let res = await s3.headObject(params).promise();
  } catch(e) {
    ctx.status = 404;
    ctx.body = {
      message: 'Not found',
      code: 24,
    };
    return -1;
  };
  params.Key = uID + '/' + dest;
  let flag = true;
  while (flag) {
    try {
      res = await s3.headObject(params).promise();
      dest = dest + '_copy';
      params.Key = uID + '/'+ dest;
    } catch(e) {
      flag = false;
    };
  };
  params = {
    Bucket: bucket,
    CopySource: bucket + '/' + uID + '/' + source,
    Key: uID + '/' + dest
  };
  res = await s3.copyObject(params).promise();
  return 1;
};

async function fileDel(ctx, source, uID) {
  let params = {
    Bucket: bucket,
    Key: uID + '/' + source
  };
  try {
    let res = await s3.headObject(params).promise();
  } catch(e) {
    ctx.status = 404;
    ctx.body = {
      message: 'No such file',
      code: 25
    };
    return -1;
  };
  res = await s3.deleteObject(params).promise();
  if (res.length == undefined) {
    return 1;
  } else {
    ctx.status = 400;
    ctx.body = {
      message: 'Something went wrong',
      code: 26
    };
    return -1;
  };  
};

async function dirCopy(ctx, source, dest, uID) {
  if (dest.charAt(dest.length - 1) == '/') {
    dest = dest.substr(0, dest.length - 1);
  };
  if (dest == '') {
    ctx.status = 400;
    ctx.body = {
      message: 'Cannot be empty',
      code: 27
    };
    return -1;
  };
  let copySources = [];
  let keys = [];
  let flag = true;
  let params = {
    Bucket: bucket,
    Prefix: uID + '/' + dest
  };
  let res;
  while (flag) {
    res = await s3.listObjects(params).promise();
    if (res.Contents.length == 0) {
      flag = false;
    } else {
      dest = dest + '_copy';
    };
    params.Prefix = uID + '/' + dest;
  };
  params.Prefix = uID + '/' + source;
  res = await s3.listObjects(params).promise();
  if (res.Contents.length == 0) {
    ctx.status = 404;
    ctx.body = {
      message: 'No such folder',
      code: 28
    };
    return -1;
  } else {
    for (let i = 0; i < res.Contents.length; i++) {
      copySources.push(bucket + '/' + res.Contents[i].Key);
      keys.push(res.Contents[i].Key.replace(source, dest + '/'));
    };
  };
  let promArr = [];
  for (let i = 0; i < keys.length; i++) {
    params = {
      Bucket: bucket,
      CopySource: copySources[i],
      Key: keys[i]
    };
    promArr.push(s3.copyObject(params).promise());
  };
  try {
    res = await Promise.all(promArr);
  } catch(e) {
    console.log(e);
  };
  return 1;
};

async function dirDel(ctx, source, uID) {
  let objects = [];
  let params = {
    Bucket: bucket,
    Prefix: uID + '/' + source
  };
  let res = await s3.listObjects(params).promise();
  if (res.Contents.length == 0) {
    ctx.status = 404;
    ctx.body = {
      message: 'No such folder',
      code: 29
    };
    return -1;
  } else {
    for (let i = 0; i < res.Contents.length; i++) {
      objects.push({Key: res.Contents[i].Key});
    };
  };
  params = {
    Bucket: bucket,
    Delete: {Objects: objects}
  };
  res = await s3.deleteObjects(params).promise();
  if (res.Errors.length == 0) {
    return 1;
  } else {
    ctx.status = 400;
    ctx.body = {
      message: res.Errors,
      code: 30
    };
    return -1;
  };
};

module.exports = {
  test: async (ctx) => {
    console.log(1);
    let res = await s3.listBuckets({}).promise();
    console.log(res);
    ctx.body = 'darn it!';
  },
  reg: async (ctx, next) => {
    let email = ctx.request.body.email;
    let password = ctx.request.body.password;
    if (email == null || password == null) {
      ctx.status = 400;
      ctx.body = {
        message: 'Bad request',
        code: '1'
      };
      return;
    }
    try {
      let res = await pgClient.query('INSERT INTO "S3UserTable" ("email", "password") VALUES ($1, $2)', [email, password]);
      if (res.rowCount == 1) {
        ctx.status = 201;
        ctx.body = {
          message: "Created"
        };
      } 
    } catch (e) {
      if (e.code == 23505) {
        ctx.status = 409;
        ctx.body = {
          message: 'Conflict. Email alredy exists',
          code: '2'
        }
      } else {
        ctx.status = 400;
        ctx.body = {
          message: 'Unknown error',
          code: '3'
        };
        console.log(e);
      }
    }
  },

  auth: async (ctx) => {
    let res = await locAuth(ctx);
    if (res !== -1) {
      payload = {email: ctx.request.body.email};
      token = jwt.sign(payload, 'mySecretTokenKey', {expiresIn: '365d'});
      ctx.body = {token: 'Bearer ' + token};
    }
  },

  generate: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      code = uuid();
      res = pgClient.query('INSERT INTO "S3AccessCodesTable" ("date", "code", "uID") VALUES ($1, $2, $3)', [new Date().toISOString(), code, user.uID]);
      ctx.status = 201;
      ctx.body = {
        code: code
      };
    }
  },

  listRoot: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let path = ctx.request.body.path;
      let params = {
        Bucket: bucket,
        Delimiter: '/',
        Prefix: user.uID + '/'
      };
      let res = await s3.listObjects(params).promise();
      res = await parseRes(res);
      let sCount = await pgClient.query('SELECT COUNT(*) FROM "envFiles" WHERE "envID" = (SELECT "envID" FROM "userEnv" WHERE "uID" = $1)', [user.uID]);
      res.folders.push({
        name: 'shared',
        size: sCount.rows[0].count
      });
      ctx.status = 200; 
      ctx.body = res;
    }
  },
  
  listShared: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let res = await pgClient.query('SELECT "fName", "fSize", "fKey" FROM "envFiles" WHERE "envID" = (SELECT "envID" FROM "userEnv" WHERE "uID" = $1)', [user.uID]);
      let files = [];
      for (let i = 0; i < res.rowCount; i++) {
        files.push({
          name: res.rows[i].fName,
          size: res.rows[i].fSize,
          code: await getCode(res.rows[i].fKey)
        });
      };
      ctx.body = {
        files: files,
        folders: []
      };
    };
  },
  
  list: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let path = ctx.params.path;
      let params = {
        Bucket: bucket,
        Delimiter: '/',
        Prefix: user.uID + '/' + path + '/'
      };
      let res = await s3.listObjects(params).promise();
      res = await parseRes(res);
      ctx.status = 200;
      ctx.body = res;
    }
  },

  delete: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      if (ctx.request.body.source == undefined) {
        ctx.status = 400;
        ctx.body = {
          message: 'Missing source',
          code: 31
        };
        return;
      };
      let source = ctx.request.body.source;
      let res;
      if (source.charAt(source.length - 1) == '/') {
        res = await dirDel(ctx, source, user.uID);
      } else {
        res = await fileDel(ctx, source, user.uID);
      };
      if (res == 1) {
        ctx.status = 200;
        ctx.body = {message: 'Deleted'};
      };
    }
  },

  move: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      if (ctx.request.body.source == undefined || ctx.request.body.destination == undefined) {
        ctx.status = 400;
        ctx.body = {
          message: 'Missing source or destination',
          code: 32
        };
        return;
      };
      let source = ctx.request.body.source;
      let dest = ctx.request.body.destination;
      let res;
      if (source.charAt(source.length - 1) == '/') {
        res = await dirCopy(ctx, source, dest, user.uID);
        if (res !== 1) {
          return;
        };
        res = await dirDel(ctx, source, user.uID);
      } else {
        res = await fileCopy(ctx, source, dest, user.uID);
        if (res !== 1) {
          return;
        };
        res = await fileDel(ctx, source, user.uID);
      };
      if (res == 1) {
        ctx.status = 200;
        ctx.body = {message: 'Moved'};
      };
    }
  },

  copy: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      if (ctx.request.body.source == undefined || ctx.request.body.destination == undefined) {
        ctx.status = 400;
        ctx.body = {
          message: 'Missing source or destination',
          code: 33
        };
        return;
      };
      let source = ctx.request.body.source;
      let dest = ctx.request.body.destination;
      let res;
      if (source.charAt(source.length - 1) == '/') {
        res = await dirCopy(ctx, source, dest, user.uID);
      } else {
        res = await fileCopy(ctx, source, dest, user.uID);
      };
      if (res == 1) {
        ctx.status = 200;
        ctx.body = {message: 'Copied'};
      };
    };
  },

  mkdir: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let fName = ctx.params.key;
      console.log(fName);
      if (fName.charAt(fName.length - 1) !== '/') {
        fName = fName + '/';
        console.log(fName);
      };
      let params = {
        Bucket: bucket,
        Key: user.uID + '/' + fName
      };
      console.log(params);
      try {
        let res = await s3.headObject(params).promise();
        console.log(res);
        ctx.status = 400;
        ctx.body = {
          message: 'Already exists',
          code: 17
        };
        return;
      } catch (e) {
        console.log(e);
        console.log(res);
        res = await s3.putObject(params).promise();
        console.log(res);
        ctx.status = 201;
        ctx.body = {
          message: 'Created'
        };
      };
    };
  },

  downCode: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let code = uuid();
      let key = user.uID + '/' + ctx.params.key;
      let res = await pgClient.query('INSERT INTO "downCodes" ("code", "key") VALUES ($1, $2)', [code, key]);
      if (res.rowCount == 1) {
        ctx.status = 201;
        ctx.body = {
          message: "Created",
          code: code
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          message: "Failed to insert code",
          code: 14,
        };
        console.log(ctx);
      };
    };
  },

  download: async (ctx) => {
    let res = await pgClient.query('SELECT "key" FROM "downCodes" WHERE "code" = $1', [ctx.params.code]);
    if (res.rowCount == 1) {
      let key = res.rows[0].key;
      let params = {
        Bucket: bucket,
        Key: key
      };
      res = pgClient.query('DELETE FROM "downCodes" WHERE "code" = $1', [ctx.params.code]);
      try {
        let res = await s3.headObject(params).promise();
      } catch (e) {
        ctx.status = 404;
        ctx.body = {
          message: 'File not found',
          code: 10
        };
        return;
      }
      let keyArr = key.split('/');
      let fName = keyArr[keyArr.length - 1];
      //let fs = require('fs');
      //let dest = fs.createWriteStream('testFile.avi');
      let body = s3.getObject(params).createReadStream();
      ctx.attachment(fName);
      ctx.body = body;
      //body.pipe(dest);
    } else {
      res = await pgClient.query('SELECT "id", "key", "activated" FROM "linksFiles" WHERE "code" = $1', [ctx.params.code]);
      if (res.rowCount == 1) {
        let id = res.rows[0].id;
        let key = res.rows[0].key;
        let activated = res.rows[0].activated;
        let params = {
          Bucket: bucket,
          Key: key
        };
        try {
          res = await s3.headObject(params).promise();
        } catch(e) {
          ctx.status = 404;
          ctx.body = {
            message: 'File not found',
            code: 34
          };
        };
        res = await pgClient.query('UPDATE "linksFiles" SET "activated" = $1 WHERE "id" = $2', [activated + 1, id]);
        let keyArr = key.split('/');
        let fName = keyArr[keyArr.length - 1];
        console.log(fName);
        res = await s3.getObject(params).createReadStream();
        ctx.attachment(fName);
        ctx.body = res;
      } else {
        ctx.status = 404;
        ctx.body = {
          message: 'Code not found',
          code: 15
        };
      }; 
    };
  },

  upload: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let key = ctx.params.key;
      const fs = require('fs');
      try {
        let body = fs.createReadStream(ctx.request.files[0].path);
        let params = {
          Body: body,
          Bucket: bucket,
          Key: user.uID + '/' + key
        };
        let res = await s3.upload(params).promise();
        if (res.ETag.length !== undefined) {
          ctx.status = 200;
          ctx.body = {success: true};
        }
      } catch (e) {
        console.log(e);
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: e
        };
      }
    };
  },

  getSharedEnv: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let res = await pgClient.query('SELECT "envID" FROM "userEnv" WHERE "uID" = $1', [user.uID]);
      if (res.rowCount !== 0) {
        res = await pgClient.query('SELECT "S3UserTable"."ID", "S3UserTable"."email" FROM "userEnv", "S3UserTable" WHERE "userEnv"."envID" = $1 AND "S3UserTable"."ID" = "userEnv"."uID"', [res.rows[0].envID]);
        let users = [];
        for (let i = 0; i < res.rowCount; i++) {
          users.push({
            email: res.rows[i].email,
            uID: res.rows[i].ID
          });
        };
        ctx.body = {
          users: users
        };
      } else {
        let users = [user];
        ctx.body = {
          users: users
        };
      };
    };
  },

  addToSharedEnv: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let code = ctx.request.body.code;
      let res = await pgClient.query('SELECT "ID", "uID", "activated" FROM "S3AccessCodesTable" WHERE "code" = $1', [code]);
      if (res.rowCount !== 0) {
        let activated = res.rows[0].activated;
        activated = activated + 1;
        let update = pgClient.query('UPDATE "S3AccessCodesTable" SET "activated" = $1 WHERE "ID" = $2', [activated, res.rows[0].ID]);
        let ownerID = res.rows[0].uID;
        res = await pgClient.query('SELECT "envID" FROM "userEnv" WHERE "uID" = $1', [ownerID]);
        if (res.rowCount == 0) {
          res = await pgClient.query('INSERT INTO "userEnv" ("uID") VALUES ($1) RETURNING "envID"', [ownerID]);
        }
        let envID = res.rows[0].envID;
        res = await pgClient.query('SELECT "envID" FROM "userEnv" WHERE "uID" = $1', [user.uID]);
        if (res.rowCount !== 0) {
          res = pgClient.query('UPDATE "userEnv" SET "envID" = $1 WHERE "uID" = $2', [envID, user.uID]);
          ctx.status = 200;
          ctx.body = {
            message: 'Moved'
          };
        } else {
          res = await pgClient.query('INSERT INTO "userEnv" ("envID", "uID") VALUES ($1, $2)', [envID, user.uID]);
          ctx.status = 201;
          ctx.body = {
            message: 'Added'
          };
        };
      } else {
        ctx.status = 404;
        ctx.body = {
          message: 'Code not found',
          code: 18
        };
        return;
      }
    };
  },

  delFromSharedEnv: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let toDel = ctx.params.uID;
      if (toDel == user.uID) {
        ctx.status = 400;
        ctx.body = {
          message: 'Trying to delete myself',
          code: 22
        };
        return;
      };
      let res = await pgClient.query('SELECT "envID" FROM "userEnv" WHERE "uID" = $1', [user.uID]);
      if (res.rowCount <= 1) {
        ctx.status = 400;
        ctx.body = {
          message: 'Not in environment',
          code: 19
        };
        return;
      };
      res = pgClient.query('DELETE FROM "userEnv" WHERE "envID" = $1 AND "uID" = $2', [res.rows[0].envID, toDel]);
      ctx.body = {
        message: 'Deleted'
      };
    };
  },

  toShared: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let key = user.uID + '/' + ctx.params.key;
      let res = await pgClient.query('SELECT "envID" FROM "envFiles" WHERE "fKey" = $1', [key]);
      if (res.rowCount !== 0) {
        ctx.status = 400;
        ctx.body = {
          message: "File already shared",
          code: 20
        };
        return;
      };
      let keyArr = key.split('/');
      let fName = keyArr[keyArr.length - 1];
      if (fName == '') {
        fName = keyArr[keyArr.length - 2];
      };
      let fSize = await getSizeFromKey(key);
      if (fSize == -1) {
        ctx.status = 400;
        ctx.body = {
          message: 'No such file',
          code: 21
        };
        return;
      };
      res = await pgClient.query('SELECT "envID" FROM "userEnv" WHERE "uID" = $1', [user.uID]);
      if (res.rowCount == 0) {
        res = await pgClient.query('INSERT INTO "userEnv" ("uID") VALUES ($1) RETURNING "envID"', [user.uID]);
      };
      res = pgClient.query('INSERT INTO "envFiles" ("envID", "fName", "fKey", "fSize") VALUES ($1, $2, $3, $4)', [res.rows[0].envID, fName, key, fSize]);
      ctx.status = 201;
      ctx.body = {
        message: 'Shared'
      };
    };
  },

  fromShared: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user !== -1) {
      let fKey = user.uID + '/' + ctx.params.key;
      let res = await pgClient.query('DELETE FROM "envFiles" WHERE "fKey" = $1', [fKey]);
      ctx.body = {
        message: 'Removed from shared'
      };
    };
  },

  getAllLinks: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user == -1) {
      return;
    };
    let res = await pgClient.query('SELECT "id", "code", "key", "date", "activated" FROM "linksFiles" WHERE "uID" = $1', [user.uID]);
    let message = [];
    for (let i = 0; i < res.rowCount; i++) {
      let key = res.rows[i].key.replace(user.uID + '/', '');
      message.push({
        id: res.rows[i].id,
        link: '185.124.188.91:3000/download/' + res.rows[i].code,
        key: key,
        date: res.rows[i].date,
        activated: res.rows[i].activated
      });
    };
    ctx.status = 200;
    ctx.body = {message: message};
  },

  getLinks: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user == -1) {
      return;
    };
    let key = ctx.params.key;
    let res = await pgClient.query('SELECT "id", "code", "date", "activated" FROM "linksFiles" WHERE "key" = $1', [user.uID + '/' + key]);
    let message = [];
    for (let i = 0; i < res.rowCount; i++) {
      message.push({
        id: res.rows[i].id,
        link: '185.124.188.91:3000/download/' + res.rows[i].code,
        date: res.rows[i].date,
        activated: res.rows[i].activated
      });
    };
    ctx.status = 200;
    ctx.body = {message: message};
  },

  toLinks: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user == -1) {
      return;
    };
    let key = ctx.params.key;
    let params = {
      Bucket: bucket,
      Key: user.uID + '/' + key
    };
    try {
      let res = await s3.headObject(params).promise();
    } catch(e) {
      ctx.status = 404;
      ctx.body = {
        message: 'No such file',
        code: 35
      };
      return;
    };
    let code = uuid();
    res = await pgClient.query('INSERT INTO "linksFiles" ("code", "key", "date", "uID") VALUES ($1, $2, $3, $4)', [code, user.uID + '/' + key, new Date().toISOString(), user.uID]);
    ctx.status = 201;
    ctx.body = {message: '185.124.188.91:3000/download/' + code};
  },

  fromLinks: async (ctx) => {
    let user = await jwtAuth(ctx);
    if (user == -1) {
      return;
    };
    let id = ctx.params.id;
    try {
      let res = await pgClient.query('DELETE FROM "linksFiles" WHERE "id" = $1', [id]);
    } catch(e) {
      ctx.status = 400;
      ctx.body = {
        message: 'Given parameter is not an ID',
        code: 36
      };
      return;
    };
    ctx.status = 200;
    ctx.body = {message: 'Deleted'};
  }
}
