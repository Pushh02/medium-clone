import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@pushh02/blogpush-validation/dist";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("Authorization") || "";
  if (!header) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }
  const token = header.split(" ")[1];

  const response = await verify(token, c.env.JWT_SECRET);
  console.log(response);
  if (response.id) {
    c.set("userId", response.id);
    await next();
  } else {
    c.status(403);
    return c.json({ message: "You are not logged in" });
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const authorId = c.get("userId");
  const body = await c.req.json();
  const {success} = createBlogInput.safeParse(body)
  if(!success){
    c.status(411);
    return c.text("Invalid inputs");
  }
  try {
    const post = prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: authorId,
      },
    });
    return c.json({
      id: (await post).id,
    });
  } catch (err) {
    c.status(411);
    return c.json({ message: "error while posting blogs" });
  }
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const {success} = updateBlogInput.safeParse(body)
  if(!success){
    c.status(411);
    return c.text("Invalid inputs");
  }
  try {
    const post = prisma.post.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });
    return c.json({
      id: (await post).id,
    });
  } catch (err) {
    c.status(411);
    return c.json({ message: "error while updating the blogs" });
  }
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const post = await prisma.post.findMany();
    return c.json({ post });
  } catch (err) {
    c.status(411);
    return c.json({ message: "error while fetching the blogs" });
  }
});

blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const id = c.req.param("id");
    const post = prisma.post.findFirst({
      where: {
        id: id,
      },
    });
    return c.json({
      post: await post,
    });
  } catch (err) {
    c.status(411);
    return c.json({ message: "error while fetching blogs" });
  }
});
