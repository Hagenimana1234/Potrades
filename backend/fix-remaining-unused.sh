#!/bin/bash

# Fix unused destructured variables
sed -i 's/const { action, data } = job.data;/const { action } = job.data;/' src/jobs/index.ts
sed -i 's/const { userId } = job.data;/const { userId: _userId } = job.data;/' src/jobs/index.ts 
sed -i 's/const settlementCheckWorker =/const _settlementCheckWorker =/' src/jobs/index.ts
sed -i 's/const { payload } =/const { payload: _payload } =/' src/services/auth.service.ts

# Check if tradeLimiter is already prefixed
grep "_tradeLimiter" src/routes/index.ts > /dev/null || sed -i 's/tradeLimiter/_tradeLimiter/' src/routes/index.ts

# Check if CACHE_TTL is already prefixed  
grep "_CACHE_TTL" src/services/marketData.service.ts > /dev/null || sed -i 's/CACHE_TTL/_CACHE_TTL/' src/services/marketData.service.ts

echo "Fixed remaining unused variables"
