import { PrismaClient } from '@prisma/client';

/**
 * Seed Platform Wallet Addresses
 *
 * IMPORTANT: Replace these with your ACTUAL platform wallet addresses
 * These are example addresses - DO NOT use them for real transactions!
 */
export async function seedPlatformWallets() {
  const prisma = new PrismaClient();

  console.log('🔐 Seeding platform wallet addresses...');

  const wallets = [
    {
      network: 'BTC',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Example BTC address
      label: 'Bitcoin Deposit Wallet',
      notes: 'Main BTC receiving address for deposits',
    },
    {
      network: 'ETH',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Example ETH address
      label: 'Ethereum Deposit Wallet',
      notes: 'Main ETH receiving address for deposits',
    },
    {
      network: 'TRC20',
      address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', // Example TRON address
      label: 'USDT (TRC20) Deposit Wallet',
      notes: 'Tron network USDT receiving address',
    },
    {
      network: 'ERC20',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Example ERC20 address (same as ETH)
      label: 'USDT (ERC20) Deposit Wallet',
      notes: 'Ethereum network USDT receiving address',
    },
    {
      network: 'BEP20',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Example BSC address
      label: 'USDT (BEP20) Deposit Wallet',
      notes: 'Binance Smart Chain USDT receiving address',
    },
    {
      network: 'SOL',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Example Solana address
      label: 'Solana Deposit Wallet',
      notes: 'Main SOL receiving address for deposits',
    },
  ];

  for (const wallet of wallets) {
    const existing = await prisma.platformWallet.findUnique({
      where: { network: wallet.network as any },
    });

    if (existing) {
      console.log(`  ⚠️  ${wallet.network} wallet already exists, skipping...`);
      continue;
    }

    await prisma.platformWallet.create({
      data: {
        network: wallet.network as any,
        address: wallet.address,
        label: wallet.label,
        notes: wallet.notes,
        isActive: true,
      },
    });

    console.log(`  ✅ Created ${wallet.network} wallet: ${wallet.address}`);
  }

  console.log('✅ Platform wallets seeded successfully!');

  await prisma.$disconnect();
}
