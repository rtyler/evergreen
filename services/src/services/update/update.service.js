// Initializes the `update` service on path `/update`
const createService = require('feathers-sequelize');
const createModel = require('../../models/update');
const hooks = require('./update.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'update',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/update', createService(options));
  app.service('update').hooks(hooks.getHooks());
};
