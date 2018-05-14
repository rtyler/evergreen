/*
 * The Storage module simply contains common functions necessary for the
 * evergreen-client to store its own data.
 */

class Storage {
  /*
   * Returns the default home directory or the value of EVERGREEN_HOME
   */
  homeDirectory() {
    /* The default home directory is /evergreen, see the Dockerfile in the root
     * directory of th repository
     */
    if (!process.env.EVERGREEN_HOME) {
      return '/evergreen';
    }
    return process.env.EVERGREEN_HOME;
  }
}

module.exports = new Storage();
