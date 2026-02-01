#!/bin/bash

# Read the file to check line 141
LINE141=$(sed -n '141p' src/services/savings.service.ts)
if echo "$LINE141" | grep -q "deductFromWallet"; then
    # Replace the deductFromWallet call with proper debitWallet call
    # First, we need to insert a line before to get the wallet
    sed -i '141s|await walletService.deductFromWallet(userId, '\''TRADING'\'', amount);|const wallet = await walletService.getWallet(userId, '\''REAL'\'');\n      await walletService.debitWallet(userId, wallet.id, amount, '\''WITHDRAWAL'\'', '\''Savings deposit'\'');|' src/services/savings.service.ts
fi

# Find and replace addToWallet around line 252
LINE252=$(sed -n '252p' src/services/savings.service.ts)
if echo "$LINE252" | grep -q "addToWallet"; then
    sed -i '252s|await walletService.addToWallet(userId, '\''TRADING'\'', totalValue);|const wallet = await walletService.getWallet(userId, '\''REAL'\'');\n      await walletService.creditWallet(userId, wallet.id, totalValue.toNumber(), '\''DEPOSIT'\'', '\''Savings withdrawal'\'');|' src/services/savings.service.ts
fi

echo "Attempted to fix wallet method calls"
