import express from 'express';
import Todo from "../schemas/todo.schema.js";
import joi from "joi";
const router = express.Router();

// 👉 **할 일 생성 API 유효성 검사 요구사항**

// 1. `value` 데이터는 **필수적으로 존재**해야한다.
// 2. `value` 데이터는 **문자열 타입**이어야한다.
// 3. `value` 데이터는 **최소 1글자 이상**이어야한다.
// 4. `value` 데이터는 **최대 50글자 이하**여야한다.
// 5. 유효성 검사에 실패했을 때, 에러가 발생해야한다.
const createdTodoSchema = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/* 할일 등록 API */
router.post("/todos", async (req, res, next) => {
  try {
    // 1. 클라이언트로부터 받아온 value 데이터를 가져온다.
    // const {value} = req.body;

    const validation = await createdTodoSchema.validateAsync(req.body);

    const { value } = validation;

    // 1-5. 만약, 클라이언트가 value 데이터를 전달하지 않았을 때, 클라이언트에게 에러 메시지를 전달한다.
    if (!value) {
      return res
        .status(400)
        .json({ errorMsssage: "해야할 일(value) 데이터가 존재하지 않습니다." });
    }

    // 2. 해당하는 마지막 order 데이터를 조회한다.
    // findOne = 1개의 데이터만 조회한다.
    // sort = 정렬한다. -> 어떤 컬럼을?
    const todoMaxOrder = await Todo.findOne().sort("-order").exec(); // 'sort('-...')' : 내림차순
    // exec() : 몽구스뒤에 붙이면 정상적으로 데이터를 조회할 수 있음. 없으면 promise로 동작하지 않기 때문에 await가 작동하지 않음

    // 3. 만약 존재한다면 현재 해야 할 일을 +1 하고, order 데이터가 존재하지 않는다면, 1로 할당한다.
    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // 4. 해야 할 일 등록
    const todo = new Todo({ value, order });
    await todo.save();

    // 5. 해야할 일을 클라이언트에게 반환한다.
    return res.status(201).json({ todo: todo });
  } catch (error) {
    //Router 다음에 있는 에러 처리 미들웨어를 실행한다.
    next(error);
  }
});

/** 해야할 일 목록 조회 API **/
router.get("/todos", async (req, res, next) => {
  // 1. 해야할 일 목록 조회를 진행한다.
  const todos = await Todo.find().sort("-order").exec();

  // 2. 해야할 일 목록 조회 결과를 클라이언트에게 반환한다.
  return res.status(200).json({ todos });
});

/* 해야할 일 순서 변경, 완료 / 해제, 내용 변경 API */
router.patch("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  // 현재 나의 order가 무엇인지 알아야한다.
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMsssage: "존재하지 않는 해야할 일입니다." });
  }

  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }

    currentTodo.order = order;
  }

  if (done !== undefined) {
    currentTodo.doneAt = done ? new Date() : null;
  }

  if (value) {
    currentTodo.value = value;
  }

  await currentTodo.save();

  return res.status(200).json({});
});

/* 할 일 삭제 API */
router.delete("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;

  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMsssage: "존재하지 않는 해야할 일 정보입니다." });
  }

  await Todo.deleteOne({ _id: todoId });

  return res.status(200).json({});
});

export default router;
