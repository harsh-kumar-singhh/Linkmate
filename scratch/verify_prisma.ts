import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking if prisma.chatSession is defined...");
  if (prisma.chatSession) {
    console.log("SUCCESS: prisma.chatSession is defined.");
  } else {
    console.log("FAILURE: prisma.chatSession is still undefined.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Error checking prisma client:", e);
    process.exit(1);
  })
  .finally(async () => {
    // We don't need to disconnect here as we're just checking property existence,
    // but if we were querying we should.
  });
