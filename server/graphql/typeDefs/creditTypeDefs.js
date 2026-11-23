export default `#graphql
  enum CreditType { EARN SPEND BONUS REFUND }

  type CreditTransaction {
    id: ID!
    type: CreditType!
    amount: Int!
    balanceAfter: Int!
    reason: String!
    refType: String!
    createdAt: DateTime!
  }

  type CreditTxnPage {
    items: [CreditTransaction!]!
    pageInfo: PageInfo!
  }

  type CreditRules {
    signupBonus: Int!
    perTeachingHour: Int!
    maxPerSession: Int!
    creditRequestCost: Int!
  }

  type CreditWallet {
    balance: Int!
    earned: Int!
    spent: Int!
    rules: CreditRules!
    transactions(page: PageInput): CreditTxnPage!
  }

  extend type Query {
    myCredits: CreditWallet!
  }
`;
