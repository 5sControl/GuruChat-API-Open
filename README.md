# About Chat Guru

The ultimate **AI-powered digital assistant** for your business. With its extensive expertise in your industry, business operations, customers, and company history, it's like having a second brain at your disposal. Communicating in plain and friendly language, ChatGuru **effortlessly tackles even the toughest questions** and offers invaluable recommendations. 

By serving as a knowledge repository and intelligent interface, ChatGuru aims to be a **powerful partner** that accelerates your business and helps you to **stay ahead of the competition.**

ChatGuru is an **on-premise solution**. With this model, you and only you **control your data and infrastructure**, ensuring that your info remains secure and private.

**Remember: the value of GhatGurtu would increase substantially as its knowledge base grows.**

# Getting started

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

# **Documentation**

[Documentation for Developers](https://github.com/5sControl/5s-dev-documentation/wiki)

[User Documentation](https://github.com/5sControl/Manufacturing-Automatization-Enterprise/wiki)


# **Contributing**
Thank you for considering contributing to 5controlS. We truly believe that we can build an outstanding product together!

We welcome a variety of ways to contribute. Read below to learn how you can take part in improving 5controlS.

## **Code of conduct**

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Code contributing

If you want to contribute, read  our [contributing guide](CONTRIBUTING.md) to learn about our development process and pull requests workflow.

We also have a list of [good first issues](https://github.com/5sControl/GuruChat-API_Open/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) that will help you make your first step to beсoming a 5S contributor.

<br>
<div align="center">
  <a href="https://5controls.com/" style="text-decoration:none;">
    <img src="https://github.com/5sControl/Manufacturing-Automatization-Enterprise/blob/3bafa5805821a34e8b825df7cc78e00543fd7a58/assets/Property%201%3DVariant4.png" width="10%" alt="" /></a> 
  <img src="https://github.com/5sControl/5s-backend/assets/131950264/d48bcf5c-8aa6-42c4-a47d-5548ae23940d" width="3%" alt="" />
  <a href="https://github.com/5sControl" style="text-decoration:none;">
    <img src="https://github.com/5sControl/Manufacturing-Automatization-Enterprise/blob/3bafa5805821a34e8b825df7cc78e00543fd7a58/assets/github.png" width="4%" alt="" /></a>
  <img src="https://github.com/5sControl/5s-backend/assets/131950264/d48bcf5c-8aa6-42c4-a47d-5548ae23940d" width="3%" alt="" />
  <a href="https://www.youtube.com/@5scontrol" style="text-decoration:none;">
    <img src="https://github.com/5sControl/Manufacturing-Automatization-Enterprise/blob/ebf176c81fdb62d81b2555cb6228adc074f60be0/assets/youtube%20(1).png" width="5%" alt="" /></a>
</div>




