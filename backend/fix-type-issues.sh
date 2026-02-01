#!/bin/bash

# Fix sessionId -> sessionID
sed -i 's/req\.sessionId/req.sessionID/g' src/controllers/profile.controller.ts

# Fix createTransporter -> createTransport
sed -i 's/createTransporter/createTransport/g' src/services/email.service.ts

# Fix import issue - change _tradeLimiter back to tradeLimiter in the import, but keep it prefixed in the const
sed -i 's/import.*_tradeLimiter.*from/import { tradeLimiter as _tradeLimiter } from/' src/routes/index.ts

# Fix _SavingsPlanType -> SavingsPlanType
sed -i 's/_SavingsPlanType/SavingsPlanType/g' src/services/savings.service.ts

# Remove ValidationError from settings.service.ts import
sed -i 's/, ValidationError//' src/services/settings.service.ts
sed -i 's/ValidationError, //' src/services/settings.service.ts

# Remove SavingsDepositStatus from import (unused)
sed -i 's/, SavingsDepositStatus//' src/services/savings.service.ts
sed -i 's/SavingsDepositStatus, //' src/services/savings.service.ts

# Remove Decimal from import (unused)
sed -i 's/import { Decimal } from .@prisma\/client\/runtime\/library.;//' src/services/savings.service.ts

echo "Fixed type issues"
