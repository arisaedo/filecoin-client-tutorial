const express = require('express');
const fs = require("fs");
const { ffs, createPow } = require("@textile/powergate-client")
const { JobStatus } = require("@textile/grpc-powergate-client/dist/ffs/rpc/rpc_pb")
console.log(JobStatus)
const pow = createPow({ host:"http://0.0.0.0:6002" })
const server = express();

server.listen(8080, async () => {
  const { token } = await pow.ffs.create()
  console.log("emitted token", {token});
  pow.setToken(token)

  // health check
  await health()

  // image push stuff
  const buffer = fs.readFileSync(`dog.jpg`)
  console.log(buffer)
  const { cid } = await pow.ffs.stage(buffer)
  console.log("IPFS ->", cid)

  // job stuff
  let jobId;
  await pow.ffs.pushStorageConfig(cid).then((data) => {
    jobId = data.jobId
  })

  console.log("processing jobid ->", jobId);

  // watch the FFS job status to see the storage process progressing
  const jobsCancel = pow.ffs.watchJobs((job) => {
    if (job.status === JobStatus.JOB_STATUS_CANCELED) {
      console.log("job canceled")
    } else if (job.status === JobStatus.JOB_STATUS_FAILED) {
      console.log("job failed")
    } else if (job.status === JobStatus.JOB_STATUS_SUCCESS) {
      console.log("job success!")
    }
  }, jobId)


  // get stuff
  const { cidInfo } = await pow.ffs.show(cid)
  console.log("cid info -> ", {cidInfo})

  // retrieve data from FFS by cid
  const bytes = await pow.ffs.get(cid)
  console.log("bytes of image ->", bytes)

  if (bytes == undefined) {
    throw "cid not found bro. gtfo"
  }
});


async function health() {
  // health check
  const { status, messagesList } = await pow.health.check()
  console.log(status, messagesList)

  // peer list check
  const { peersList } = await pow.net.peers()
  console.log(peersList)
}
