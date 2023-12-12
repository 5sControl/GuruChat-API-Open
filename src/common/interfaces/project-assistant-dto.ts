export type ConfigUploads = {
    pdfPaths: string[],
    txtPaths: string[],
    youTubeLinks: string[],
    links: string[]
}

export type ConfigDataStructure = {
    projectName: string,
    infoForChatGuru: ConfigUploads
}

export type CommonConfigDataStructure = {
    projectName: string, //pass here the name of the project
    behaviourTemplate: string,  //example: take this extra information {context} and answer the question {question} as if you are a personal assistant
    extraInfoForChatPath: string,  // pass here path to folder where you store files (.docx, .pdf, .csv, .txt) with information for the model, files with unexpected extentions will be ignored
    websitesLinks: {
        link: string, //pass here link to the website, from which you want to get information
        crawlDepth: number //pass here depth of crawling children pages
    }[],
    youtubeVideoLinks: string[], // IN PROGRESS pass here links to youtube videos, from which you want to take information
    gitHubRepositories: { //IN PROGRESS
        link: string, //pass here link to GitHub repository
        branch: string //pass here the name of the branch
    }[],
    figmaProject: { //IN PROGRESS  WARNING: we can use information only from our own figma account because of figma.com privacy settings
        nodeIds: string[], // here is example how you can get necessary data from link: https://www.figma.com/file/<YOUR FILE KEY HERE>/someProjectName?type=whiteboard&node-id=<YOUR NODE ID HERE>&t=e6lqWkKecuYQRyRg-0 (this process can be automized in future)
        fileKey: string
    }[]
}