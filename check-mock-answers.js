const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const answers = await prisma.mockAnswer.findMany({
    select: {
      id: true,
      attemptId: true,
      attemptQuestionId: true,
    },
  });

  console.log("Total MockAnswer records:", answers.length);

  const seen = new Set();
  const duplicates = [];

  for (const answer of answers) {
    if (seen.has(answer.attemptQuestionId)) {
      duplicates.push(answer);
    }
    seen.add(answer.attemptQuestionId);
  }

  console.log("Duplicate attemptQuestionId records:", duplicates);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());