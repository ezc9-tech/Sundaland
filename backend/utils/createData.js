import { prisma } from "./prisma.ts";
import bcrypt from "bcrypt";

async function clearDatabase() {
  console.log("Clearing existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentInfo.deleteMany();
  await prisma.cartToProducts.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.usersToCompany.deleteMany();
  await prisma.company.deleteMany();
  await prisma.login.deleteMany();
  await prisma.user.deleteMany();
}

async function seedDatabase() {
  await clearDatabase();
  console.log("Seeding database...");

  const defaultPassword = await bcrypt.hash("1234", 10);

  const adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "System",
      phoneNumber: "555-0000",
      role: "admin",
      address: "100 Admin Center, Cloud City, CA",
      dateOfBirth: new Date("1980-01-01"),
      approved: true,
      login: {
        create: { email: "admin@marketplace.com", password: defaultPassword },
      },
    },
  });

  const approvedSeller = await prisma.user.create({
    data: {
      firstName: "Sarah",
      lastName: "Storeowner",
      phoneNumber: "555-0001",
      role: "seller",
      address: "200 Merchant Ave, Commerce, TX",
      dateOfBirth: new Date("1985-06-15"),
      approved: true,
      login: {
        create: {
          email: "sarah@techstore.com",
          password: defaultPassword,
          userToken: "token_sarah_123",
        },
      },
    },
  });

  const unapprovedSeller = await prisma.user.create({
    data: {
      firstName: "Dave",
      lastName: "Pending",
      phoneNumber: "555-0002",
      role: "seller",
      address: "404 Startup Blvd, Austin, TX",
      dateOfBirth: new Date("1992-09-10"),
      approved: false,
      login: {
        create: {
          email: "dave.pending@newstore.com",
          password: defaultPassword,
        },
      },
    },
  });

  const unapprovedSeller1 = await prisma.user.create({
    data: {
      firstName: "Sarah",
      lastName: "Jenkins",
      phoneNumber: "555-0192",
      role: "seller",
      address: "123 Tech Lane, Seattle, WA",
      dateOfBirth: new Date("1988-04-12"),
      approved: false,
      login: {
        create: {
          email: "sarah.jenkins@freshmarket.com",
          password: defaultPassword,
        },
      },
    },
  });

  const unapprovedSeller2 = await prisma.user.create({
    data: {
      firstName: "Marcus",
      lastName: "Vance",
      phoneNumber: "555-0234",
      role: "seller",
      address: "789 Innovation Dr, Denver, CO",
      dateOfBirth: new Date("1995-11-20"),
      approved: false,
      login: {
        create: {
          email: "m.vance@retailhub.net",
          password: defaultPassword,
        },
      },
    },
  });

  const unapprovedSeller3 = await prisma.user.create({
    data: {
      firstName: "Chloe",
      lastName: "Price",
      phoneNumber: "555-0456",
      role: "seller",
      address: "321 Commerce St, New York, NY",
      dateOfBirth: new Date("1990-02-15"),
      approved: false,
      login: {
        create: {
          email: "chloe.price@urbanwares.com",
          password: defaultPassword,
        },
      },
    },
  });

  const approvedBuyer = await prisma.user.create({
    data: {
      firstName: "Bob",
      lastName: "Consumer",
      phoneNumber: "555-0003",
      role: "buyer",
      address: "300 Consumer Blvd, Retail, NY",
      dateOfBirth: new Date("1995-11-20"),
      approved: true,
      login: {
        create: { email: "bob.buyer@gmail.com", password: defaultPassword },
      },
    },
  });

  const unapprovedBuyer = await prisma.user.create({
    data: {
      firstName: "Alice",
      lastName: "Newbie",
      phoneNumber: "555-0004",
      role: "buyer",
      address: "500 Fresh Ave, Portland, OR",
      dateOfBirth: new Date("1999-07-30"),
      approved: false,
      login: {
        create: {
          email: "alice.new@yahoo.com",
          password: defaultPassword,
          userToken: "token_alice_456",
        },
      },
    },
  });

  

  const techCompany = await prisma.company.create({
    data: {
      name: "Tech Gadgets Inc.",
      address: "400 Silicon Valley, CA",
      phoneNumber: "800-555-TECH",
      users: { create: { userId: approvedSeller.id } }, 
    },
  });

  const davesDiscount = await prisma.company.create({
    data: {
      name: "Dave’s Discount Electronics",
      address: "404 Startup Blvd, Austin, TX",
      phoneNumber: "800-555-DAVE",
      users: { create: { userId: unapprovedSeller.id } }, 
    },
  });

  
  const mechanicalKeyboard = await prisma.product.create({
    data: {
      name: "Pro Mechanical Keyboard",
      price: 129.99,
      description: "Tactile switches with customizable RGB lighting.",
      inventory: 50,
      approved: true,
      companyId: techCompany.id,
      pictureUrl:
        "https://media.wired.com/photos/6928c534e7dd69f52e08eeb0/master/w_1600%2Cc_limit/Tecware%2520Spectre75-2%2520source%2520henri%2520robbins.png",
    },
  });

  const wirelessMouse = await prisma.product.create({
    data: {
      name: "Ultra Wireless Mouse",
      price: 79.5,
      description: "Zero latency wireless gaming mouse.",
      inventory: 120,
      approved: true,
      companyId: techCompany.id,
      pictureUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/22/3-Tasten-Maus_Microsoft.jpg?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=original",
    },
  });

  const vrHeadset = await prisma.product.create({
    data: {
      name: "Prototype VR Headset",
      price: 399.99,
      description: "Next gen VR headset prototype. Awaiting compliance check.",
      inventory: 5,
      approved: false,
      companyId: techCompany.id,
    },
  });

  const budgetLaptop = await prisma.product.create({
    data: {
      name: "Refurbished Budget Laptop",
      price: 150.0,
      description: "Works great, minor scratches.",
      inventory: 10,
      approved: false,
      companyId: davesDiscount.id,
    },
  });

  const smartRing = await prisma.product.create({
    data: {
      name: "Beta Smart Ring",
      price: 129.99,
      description:
        "Fitness tracking smart ring. Pending final quality control.",
      inventory: 20,
      approved: false,
      companyId: techCompany.id, 
    },
  });

  const usedMonitor = await prisma.product.create({
    data: {
      name: "24-inch Monitor (Used)",
      price: 45.0,
      description: "No dead pixels, comes with power cable only. Unboxed.",
      inventory: 8,
      approved: false,
      companyId: davesDiscount.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Best keyboard I have ever used! Fast shipping.",
      userId: approvedBuyer.id,
      productId: mechanicalKeyboard.id,
    },
  });

  await prisma.paymentInfo.create({
    data: {
      cardLast4: "4242",
      cardToken: "tok_visa_123456789",
      address: "300 Consumer Blvd",
      state: "NY",
      zip: "10001",
      userId: approvedBuyer.id,
    },
  });

  await prisma.cart.create({
    data: {
      userId: approvedBuyer.id,
      items: {
        create: [
          { productId: mechanicalKeyboard.id, quantity: 1 },
          { productId: wirelessMouse.id, quantity: 2 },
        ],
      },
    },
  });

  await prisma.cart.create({
    data: {
      userId: unapprovedBuyer.id,
      items: {
        create: [{ productId: budgetLaptop.id, quantity: 1 }],
      },
    },
  });

  await prisma.order.create({
    data: {
      totalCost: 129.99,
      status: "PAID",
      shippingAddress: approvedBuyer.address,
      userId: approvedBuyer.id,
      items: {
        create: [
          {
            productId: mechanicalKeyboard.id,
            quantity: 1,
            priceAtPurchase: 129.99,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      totalCost: 159.0,
      status: "PENDING",
      shippingAddress: "Alt Address, 999 Side St, NY",
      userId: approvedBuyer.id,
      items: {
        create: [
          {
            productId: wirelessMouse.id,
            quantity: 2,
            priceAtPurchase: 79.5,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      totalCost: 399.99,
      status: "CANCELLED",
      shippingAddress: approvedBuyer.address,
      userId: approvedBuyer.id,
      items: {
        create: [
          {
            productId: vrHeadset.id,
            quantity: 1,
            priceAtPurchase: 399.99,
          },
        ],
      },
    },
  });

  console.log("Database seeded successfully with all models and mixed states!");
}

seedDatabase()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
