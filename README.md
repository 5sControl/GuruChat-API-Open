## Install guru chat api
### Pull and Run model container
#### If you use NVIDIA driver to run model:
```
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
#### If you use CPU to run model:
```
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
### Download llama model
```
docker exec -it ollama ollama run llama2:13b
```
### Run guru chat api
```
npm run start
```

## Also you can run our docker container
```
docker pull 5scontrol/chat-guru-api
docker run -p 3002:3002 5scontrol/chat-guru-api
```

## API Reference

#### Get all knowledge base categories


### ChatData interface
{ \
categoryName: string;\
chatId: string;\
sources: string[];\
chatName: string;\
modelName: string;\
}

```http
  GET /aiChat/getCategories
```
#### Get available language models

```http
  GET /aiChat/getModels
```

#### Create knowledge base category

```http
  POST /aiChat/createCategory?{name}&{description}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `name`    | `string` | **Required**. Category name.      |
|`description`| `string` |**Required**. Category description.|

#### Edit knowledge base category

```http
  POST /aiChat/editCategory?{oldName}&{newName}&{description}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `oldName`    | `string` | **Required**. Category name.      |
| `newName`    | `string` | **Optional**. New name to apply to category.      |
|`description`| `string` |**Optional**. Category description.|

#### Remove knowledge base category

```http
  POST /aiChat/removeCategory?{name}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `name`    | `string` | **Required**. Category name.      |

#### Upload content to knowledge base category

```http
  POST /aiChat/upload?{categoryNname}
```
`Content-Type: 'multipart/form-data'`

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `name`    | `string` | **Required**. Category name.      |
| `body`    | `form-data` | {file?: File, link?: string}   |

#### Download file from knowledge base category

```http
  POST /aiChat/download?{categoryName}&{fileName}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `categoryName`    | `string` | **Required**. Category name.      |
| `fileName`    | `string` | **Required**. File name.  |

#### Remove content from knowledge base category

```http
  POST /aiChat/removeSource?{categoryName}&{fileName}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `categoryName`    | `string` | **Required**. Category name.      |
| `fileName`    | `string` | **Required**. File name.  |

#### Create new chat

```http
  POST /aiChat/createChat?{categoryName}&{modelName}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `categoryName`    | `string` | **Required**. Category name.      |
| `modelName`    | `string` | **Required**. Name of the model (from available models).  |

#### Remove chat

```http
  POST /aiChat/removeChat?{categoryName}&{chatId}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `categoryName`  | `string` | **Required**. Category name.|
| `chatId`   | `string` | **Required**. Chat Id to delete  |

#### Edit chat

```http
  POST /aiChat/editChat
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `body`  | `ChatData` | **Required**. New data to apply to selected chat|

#### Send prompt to selected chat

```http
  POST /aiChat/ask?{chatId}&{prompt}&{categoryName}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `chatId`  | `ChatData` | **Required**. Selected chat id.|
| `prompt`  | `ChatData` | **Required**. Your question to selected chat|






