const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        console.log('Verifying Post model connectivity...');
        const posts = await prisma.post.findMany({
            take: 1,
            select: { id: true, imageData: true }
        });
        console.log('Success! Found posts:', posts.length);
        if (posts.length > 0) {
            console.log('Columns verified: id, imageData');
        } else {
            console.log('No posts found, but query succeeded.');
        }
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
