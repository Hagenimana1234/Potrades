import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@potrades.com' },
    update: {},
    create: {
      email: 'admin@potrades.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      referralCode: 'ADMIN001',
    },
  });

  console.log('✓ Admin user created:', admin.email);

  // Create admin wallets
  await prisma.wallet.upsert({
    where: { userId_type: { userId: admin.id, type: 'DEMO' } },
    update: {},
    create: {
      userId: admin.id,
      type: 'DEMO',
      balance: 100000,
      currency: 'USD',
    },
  });

  await prisma.wallet.upsert({
    where: { userId_type: { userId: admin.id, type: 'REAL' } },
    update: {},
    create: {
      userId: admin.id,
      type: 'REAL',
      balance: 0,
      currency: 'USD',
    },
  });

  console.log('✓ Admin wallets created');

  // Create demo user
  const demoPassword = await hashPassword('demo123');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@potrades.com' },
    update: {},
    create: {
      email: 'demo@potrades.com',
      passwordHash: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      referralCode: 'DEMO001',
    },
  });

  console.log('✓ Demo user created:', demo.email);

  // Create demo user wallets
  await prisma.wallet.upsert({
    where: { userId_type: { userId: demo.id, type: 'DEMO' } },
    update: {},
    create: {
      userId: demo.id,
      type: 'DEMO',
      balance: 10000,
      currency: 'USD',
    },
  });

  await prisma.wallet.upsert({
    where: { userId_type: { userId: demo.id, type: 'REAL' } },
    update: {},
    create: {
      userId: demo.id,
      type: 'REAL',
      balance: 1000,
      currency: 'USD',
    },
  });

  console.log('✓ Demo user wallets created');

  // Create trading assets
  const assets = [
    {
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      type: 'CRYPTO',
      payoutPercent: 80,
      minTradeAmount: 1,
      maxTradeAmount: 10000,
      isOTC: false,
      order: 1,
    },
    {
      symbol: 'ETH/USD',
      name: 'Ethereum',
      type: 'CRYPTO',
      payoutPercent: 80,
      minTradeAmount: 1,
      maxTradeAmount: 10000,
      isOTC: false,
      order: 2,
    },
    {
      symbol: 'EUR/USD',
      name: 'Euro vs US Dollar',
      type: 'FOREX',
      payoutPercent: 82,
      minTradeAmount: 1,
      maxTradeAmount: 5000,
      isOTC: false,
      order: 3,
    },
    {
      symbol: 'GBP/USD',
      name: 'British Pound vs US Dollar',
      type: 'FOREX',
      payoutPercent: 82,
      minTradeAmount: 1,
      maxTradeAmount: 5000,
      isOTC: false,
      order: 4,
    },
    {
      symbol: 'USD/JPY',
      name: 'US Dollar vs Japanese Yen',
      type: 'FOREX',
      payoutPercent: 82,
      minTradeAmount: 1,
      maxTradeAmount: 5000,
      isOTC: false,
      order: 5,
    },
    {
      symbol: 'XAU/USD',
      name: 'Gold',
      type: 'COMMODITY',
      payoutPercent: 78,
      minTradeAmount: 1,
      maxTradeAmount: 10000,
      isOTC: false,
      order: 6,
    },
    {
      symbol: 'OIL/USD',
      name: 'Crude Oil',
      type: 'COMMODITY',
      payoutPercent: 78,
      minTradeAmount: 1,
      maxTradeAmount: 5000,
      isOTC: false,
      order: 7,
    },
    {
      symbol: 'SPX/USD',
      name: 'S&P 500',
      type: 'INDEX',
      payoutPercent: 80,
      minTradeAmount: 1,
      maxTradeAmount: 10000,
      isOTC: false,
      order: 8,
    },
  ];

  for (const assetData of assets) {
    const asset = await prisma.asset.upsert({
      where: { symbol: assetData.symbol },
      update: assetData,
      create: {
        ...assetData,
        isActive: true,
      },
    });
    console.log(`✓ Asset created: ${asset.symbol}`);
  }

  // Create system settings
  const settings = [
    { key: 'platform_name', value: 'PoTrades', category: 'GENERAL', isPublic: true },
    { key: 'min_deposit', value: 10, category: 'FINANCE', isPublic: true },
    { key: 'min_withdrawal', value: 10, category: 'FINANCE', isPublic: true },
    { key: 'default_demo_balance', value: 10000, category: 'TRADING', isPublic: true },
    { key: 'max_open_trades', value: 10, category: 'TRADING', isPublic: true },
    { key: 'maintenance_mode', value: false, category: 'SYSTEM', isPublic: true },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }

  console.log('✓ System settings created');

  console.log('✅ Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin@potrades.com / admin123');
  console.log('Demo: demo@potrades.com / demo123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
