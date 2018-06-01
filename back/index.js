const requires = require('./config/requires');
const routes = require('./routes/routes');

const app = new requires.koa();
const router = new requires.router();
const logger = requires.logger;
const uploader = requires.busboy();

app.use(requires.cors({
  origin: '*'
}));
app.use(logger());
app.use(requires.bodyParser());

router.get('/secretTestPath', routes.test);

//User operations
router.post('/reg', routes.reg);

router.post('/auth', routes.auth);

router.post('/gen', routes.generate);

//Operations to list
router.get('/list/shared', routes.listShared);

router.get('/list/', routes.listRoot);

router.get('/list/:path+', routes.list);

//File/folders operations
router.post('/delete', routes.delete);

router.post('/move', routes.move);

router.post('/copy', routes.copy);

//Directory operations
router.put('/mkdir/:key+', routes.mkdir);

//Shared environment operations
router.get('/shareEnv', routes.getSharedEnv);

router.post('/shareEnv', routes.addToSharedEnv);

router.delete('/shareEnv/:uID', routes.delFromSharedEnv);

//Shared with environment files operations
router.post('/shared/:key+', routes.toShared);

router.delete('/shared/:key+', routes.fromShared);

//Shared through links files operations
router.get('/links', routes.getAllLinks);

router.get('/links/:key+', routes.getLinks);

router.post('/links/:key+', routes.toLinks);

router.delete('/links/:id', routes.fromLinks);

//Download and upload operations
router.get('/get/:key+', routes.downCode);

router.get('/download/:code', routes.download);

router.post('/post/:key+', uploader, routes.upload);

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
