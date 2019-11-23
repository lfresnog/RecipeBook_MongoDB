import { MongoClient, ObjectID } from "mongodb";
import { GraphQLServer } from "graphql-yoga";
import "babel-polyfill";

/*const recipeData = [{
    id:"1",
    title: "Ensalada",
    description: "Ensalada tradicional",
    date: "02/04/2014",
    author: "1",
    ingredients:["1","2"]
}];
const authorData = [{
    id:"1",
    name:"Luis",
    mail:"lfresnog@gmail.com"
}];
const ingredientData = [
    {id:"1",name:"Tomate"},
    {id:"2",name:"Lechuga"}
];*/

const usr = "lfresnog";
const pwd = "123456abc";
const url = "miprimercluster-hjfah.gcp.mongodb.net/test?retryWrites=true&w=majority";

/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
const connectToDb = async function(usr, pwd, url) {
  const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  await client.connect();
  return client;
};

/**
 * Starts GraphQL server, with MongoDB Client in context Object
 * @param {client: MongoClinet} context The context for GraphQL Server -> MongoDB Client
 */
const runGraphQLServer = function(context) {
  const typeDefs = `
  type Recipe{
      _id: ID
      title: String!
      description: String!
      date: String!
      author: Author!
      ingredients:[Ingredient!]!
  }
  type Author{
      _id: ID
      name: String!
      mail: String!
      recipes: [Recipe!]
  }
  type Ingredient{
      _id: ID
      name: String!
      recipes: [Recipe!]
  }
  type Query{
      recipes:[Recipe!]!
      authors:[Author!]!
      ingredients:[Ingredient!]!
      authorRecipes(name:String!):[Recipe!]
      ingredientRecipes(name:String!):[Recipe!]
  }
  type Mutation{
      addRecipe(title:String!,description:String!,author:String!,ingredients:[String!]!):Recipe!
      addAuthor(name:String!,mail:String!):Author!
      addIngredient(name:String!):Ingredient!
      deleteRecipe(name:String!) : String!
      deleteAuthor(name:String!): String!
      deleteIngredient(name: String!): String!
      updateAuthor(name:String!,n_name:String,n_mail:String):String!
      updateIngredient(name:String!,n_name:String!):String!
  }
  `

  const resolvers = {
    Recipe:{
        author: async (parent, args, ctx, info)=>{
            const authorID = parent.author;
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("authorData");
            return await collection.findOne({_id: ObjectID(authorID)});
        },
        ingredients: async (parent, args, ctx, info)=>{
            const ingredientsID = parent.ingredients;
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("ingredientData");
            const arr_ingredient =[];
            ingredientsID.forEach(async elem => {
                arr_ingredient.push(await collection.findOne({_id: ObjectID(elem)}));
            });
            return arr_ingredient;
        }
    },
    Author:{
        recipes: (parent, args, ctx, info)=>{
        const authorID = parent.id;
        const {client} = ctx;
        const db = client.db("recipeBook");
        const collection = db.collection("recipeData");
        const recipes = await collection.find({author: authorID}).toArray();
        return recipes;
        },
    },
    Query:{
        recipes: async (parent, args, ctx, info) => {
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("recipeData");
            const result = await collection.find({}).toArray();
            return result;
        },
        authors: async (parent, args, ctx, info) => {
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("authorData");
            const result = await collection.find({}).toArray();
            return result;
        },
        ingredients: async (parent, args, ctx, info) => {
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("ingredientData");
            const result = await collection.find({}).toArray();
            return result;
        },
    },
    Mutation:{
        addRecipe: async (parent, args, ctx, info) => {
            const {title,description,author,ingredients} = args;
            const { client } = ctx;
   
            const db = client.db("recipeBook");
            const recipeCollection = db.collection("recipeData");
            const authorCollection = db.collection("authorData");
            const ingredientCollection = db.collection("ingredientData");
            const f_author = await authorCollection.findOne({name: author});
            const id_author = f_author._id;
            const n_date = new Date().getDate();
            const arr_ingredient = [];
            ingredients.forEach(async(elem)=>{
              const f_ingredient = await ingredientCollection.findOne({name: elem});
                if(f_ingredient==null){
                  const recipes = [];
                  const n_ingredient = await ingredientCollection.insertOne({name: elem,recipes});
                  arr_ingredient.push(n_ingredient.ops[0]._id);
                  console.log(n_ingredient.ops[0]._id);
                }else{
                  arr_ingredient.push(f_ingredient._id);
                  console.log(f_ingredient._id);
                }
            })
            console.log(arr_ingredient);
            const n_recipe = await recipeCollection.insertOne({title,description,date: n_date,author: id_author,ingredients: arr_ingredient});

            return {
              title,
              description,
              date: n_date,
              author: id_author,
              ingredients: arr_ingredient
          };
        },
        addAuthor: async (parent, args, ctx, info) => {
            const {name,mail} = args;
            const { client } = ctx;
            const recipes = [];
   
            const db = client.db("recipeBook");
            const collection = db.collection("authorData");
            const result = await collection.insertOne({name,mail,recipes});
            return {
                id: result.ops[0]._id,
                name,
                mail
            };
        },
        addIngredient: async (parent, args, ctx, info) => {
            const {name} = args;
            const {client} = ctx;
            const recipes = [];
   
            const db = client.db("recipeBook");
            const collection = db.collection("ingredientData");
            const result = await collection.insertOne({name,recipes});
            return {
                id: result.ops[0]._id,
                name
            };
        },
        deleteRecipe:async(parent,args,ctx,info)=>{
          const { client } = ctx;
          const db = client.db("recipeBook");
          const collection = db.collection("recipeData");
          const deleted = await collection.deleteOne({title: args.name})
          if(deleted.result.n == 1){
            return (`The author has changed`);
        }else{
            return (`The author doens't exist`);
        }
        },
        deleteAuthor:async(parent,args,ctx,info)=>{
          const { client } = ctx;
          const db = client.db("recipeBook");
          const recipeCollection = db.collection("recipeData");
          const authorCollection = db.collection("authorData");
          await authorCollection.deleteOne({name: args.name});
          const f_author = authorCollection.findOne({name: args.name});
          const deleted = await recipeCollection.deleteMany({author: f_author._id});
          if(deleted.result.n == 1){
            return (`The author has changed`);
        }else{
            return (`The author doens't exist`);
        }
        },
        updateAuthor: async (parent, args, ctx, info) => {
            const {name,n_name,n_mail} = args;
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("authorData");
            let f_author = await collection.updateOne({name: name},{$set:{name: n_name || name}});
            if(n_mail)
              f_author = await collection.updateOne({name: name},{$set:{mail: n_mail}});
            if(f_author.result.n == 1){
                return (`The author has changed`);
            }else{
                return (`The author doens't exist`);
            }
        },
        updateIngredient: async (parent, args, ctx, info) => {
            const {name,n_name} = args;
            const {client} = ctx;
            const db = client.db("recipeBook");
            const collection = db.collection("ingredientData");
            const f_ingredient = await collection.updateOne({name: name},{$set:{name: n_name}});
            if(f_ingredient.result.n == 1){
                return (`The author has changed`);
            }else{
                return (`The author doens't exist`);
            }
        }
    }
};

  const server = new GraphQLServer({ typeDefs, resolvers, context });
  const options = {
    port: 3003
  };

  try {
    server.start(options, ({ port }) =>
      console.log(
        `Server started, listening on port ${port} for incoming requests.`
      )
    );
  } catch (e) {
    console.info(e);
    server.close();
  }
};

const runApp = async function() {
  const client = await connectToDb(usr, pwd, url);
  console.log("Connect to Mongo DB");
  try {
    runGraphQLServer({ client });
  } catch (e) {
    client.close();
  }
};

runApp();