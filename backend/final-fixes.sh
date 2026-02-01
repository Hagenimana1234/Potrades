#!/bin/bash

# Fix unused variables
sed -i 's/const { userId } = copiedData;/const { userId: _userId } = copiedData;/' src/jobs/index.ts
sed -i 's/const { data } = job.data;/const { data: _data } = job.data;/' src/jobs/index.ts
sed -i 's/const _settlementCheckWorker =/const __settlementCheckWorker =/' src/jobs/index.ts
sed -i 's/const { payload } = decoded;/const { payload: _payload } = decoded;/' src/services/auth.service.ts
sed -i 's/const _CACHE_TTL =/const __CACHE_TTL =/' src/services/marketData.service.ts
sed -i 's/const SavingsPlanType/const _SavingsPlanType/' src/services/savings.service.ts
sed -i 's/const lockedBalance =/const _lockedBalance =/' src/services/wallet.service.ts
sed -i 's/const __connectionPoolConfig =/const ___connectionPoolConfig =/' src/utils/database.ts

# Comment out address field (doesn't exist in Prisma schema)
sed -i 's/^        address: true,$/        \/\/ address: true, \/\/ TODO: Add address field to User model/' src/services/profile.service.ts

# Remove SAVINGS_DEPOSIT and SAVINGS_WITHDRAWAL type assignments
sed -i "s/type: 'SAVINGS_DEPOSIT'/type: 'DEPOSIT'/" src/services/savings.service.ts
sed -i "s/type: 'SAVINGS_WITHDRAWAL'/type: 'WITHDRAWAL'/" src/services/savings.service.ts

echo "Applied final fixes"
