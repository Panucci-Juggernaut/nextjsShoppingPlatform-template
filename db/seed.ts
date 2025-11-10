import { PrismaClient } from '../lib/generated/prisma';
import sampleData from './sample-data';

const prisma = new PrismaClient();

async function main() {
  // Clear old data
  await prisma.product.deleteMany();
   await prisma.product.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // Insert new data
  await prisma.product.createMany({
    data: sampleData.products,
  });
  await prisma.user.createMany({ data: sampleData.users });


  console.log('Database seeded successfully!');
}

// Run and handle errors
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect!
    await prisma.$disconnect();
  });
