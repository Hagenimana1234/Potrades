#!/bin/bash

# Fix unused imports - remove from import statements
sed -i 's/generateRandomToken,//' src/services/auth.service.ts
sed -i 's/, generateRandomToken//' src/services/auth.service.ts
sed -i 's/InsufficientBalanceError,//' src/services/copyTrading.service.ts
sed -i 's/, InsufficientBalanceError//' src/services/copyTrading.service.ts
sed -i 's/WalletType,//' src/services/copyTrading.service.ts
sed -i 's/, WalletType//' src/services/copyTrading.service.ts
sed -i 's/ValidationError,//' src/services/market.service.ts
sed -i 's/, ValidationError//' src/services/market.service.ts

# Remove marketDataService import line
sed -i '/^import marketDataService/d' src/jobs/index.ts

# Prefix unused variables with underscore
sed -i 's/const CACHE_TTL =/const _CACHE_TTL =/' src/services/marketData.service.ts
sed -i 's/const tradeLimiter =/const _tradeLimiter =/' src/routes/index.ts
sed -i 's/const _connectionPoolConfig =/const __connectionPoolConfig =/' src/utils/database.ts

echo "Fixed unused imports and variables"
