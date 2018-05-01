// Initializes the `update` service on path `/update`
const createService = require('feathers-sequelize');
const createModel = require('../../models/update');
const hooks = require('./update.hooks');

module.exports = function (app) {
  const Model = createModel(app);

  const options = {
    name: 'update',
    Model,
  };

  // Initialize our service with any options it requires
  app.use('/update', createService(options));
  app.service('update').hooks(hooks.getHooks());
};
