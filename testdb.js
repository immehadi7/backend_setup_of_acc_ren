import mongoose from 'mongoose'

const uri = 'mongodb://admin:Admin12345@ac-3gilegq-shard-00-00.bwdgbl2.mongodb.net:27017,ac-3gilegq-shard-00-01.bwdgbl2.mongodb.net:27017,ac-3gilegq-shard-00-02.bwdgbl2.mongodb.net:27017/61zuhao?ssl=true&replicaSet=atlas-jxnqrw-shard-0&authSource=admin&appName=Cluster0'

console.log('Testing connection...')

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Connected to Atlas!')
    process.exit(0)
  })
  .catch((err) => {
    console.log('❌ Error:', err.message)
    process.exit(1)
  })