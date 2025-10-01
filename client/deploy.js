const ftpDeploy = require("ftp-deploy");
const ftp = new ftpDeploy();

const config = {
  user: process.env.FTP_USERNAME,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: 21,
  localRoot: __dirname + "/build",
  remoteRoot: "/home/theanswe/public_html/ourlivingneighborhoods/",
  include: ["*", "**/*"],
  deleteRemote: true,
  forcePasv: true,
};

ftp.deploy(config)
  .then(() => console.log("FTP deploy finished"))
  .catch(err => console.error("FTP deploy failed:", err));