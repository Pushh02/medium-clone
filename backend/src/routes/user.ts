import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import { signupInput, signinInput,  } from "@pushh02/blogpush-validation/dist";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const {success} = signupInput.safeParse(body)
  if(!success){
    c.status(411);
    return c.text("Invalid inputs");
  }
  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });
    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(token);
  } catch (err) {
    c.status(411);
    return c.text("Invalid");
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const {success} = signinInput.safeParse(body)
  if(!success){
    c.status(411);
    return c.text("Invalid inputs");
  }
  const user = prisma.user.findUnique({
    where: {
      email: body.email,
      password: body.password,
    },
  });

  if (!user) {
    c.status(404);
    return c.json({ error: "user not found" });
  }
  const jwt = await sign({ id: body.id }, c.env.JWT_SECRET);
  return c.json({ jwt });
});
