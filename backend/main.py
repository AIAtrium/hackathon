from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime
from host import MCPHost, ENABLED_CLIENTS
from dotenv import load_dotenv

load_dotenv()

mcp_host = MCPHost(enabled_clients=ENABLED_CLIENTS)

app = FastAPI(
    title="AI Assistant API",
    description="A simple AI Assistant",
    version="0.1.0"
)

@app.get("/start")
async def start():
    await mcp_host.initialize_mcp_clients()
    print("Initialized MCP clients")
    return JSONResponse(
        status_code=200,
        content={"status": "healthy"}
    )

@app.get("/chat-history")
async def summarize_group_chat(chat_name: str, whatsapp_user_name: str):
    system_prompt = """
    You are a travel agent.
    You are given a chat history of a group chat of friends who are planning a trip together.
    Your job is to perform tasks that help them plan the trip.
    """

    input_action = f"""
    Summarize the chat history for the group chat: {chat_name}

    IGNORE EMOJIS. You can fuzzy match in case of spelling mistakes.

    For example, if the chat name is "Frienz Trip 😎" and the query is "Friends Trip", you should summarize that chat.

    Do not summarize any other chat. Look only for the chat {chat_name}!
    If you cannot find the chat, return "Chat not found"

    You have access to tools that can help you. 
    If the tool does not allow you to retreive all the messages you need to at once, you can use the tool multiple times.
    Pull at least 50 messages but not more than 100.

    Please return your summary as a JSON serializable object with the following fields:
    'title': str, the name of the trip
    'requirements': str, the background context of the trip described in the chat. what is the purpose of the trip, where do they want to go, what are they looking to do
    'names': list[str], the names of the people in the chat, make sure to include also the person whose whatsapp you are searching, {whatsapp_user_name}
    'destination': str, optional, only fill it in if the group is in agreement on a destination, if no information use 'No information'
    'duration': str, optional, only fill it in if the group is in agreement on a duration, if no information use 'No information'
    'dates': str, optional, only fill it in if the group is in agreement on a date range, if no information use 'No information'
    'budget': str, the per person budget for the trip, if no information use 'No information'

    return NOTHING other than the JSON object.
    """

    client_list = ["Whatsapp"]
    result = await mcp_host.process_input_with_agent_loop(
        input_action=input_action,
        system_prompt=system_prompt,
        client_list=client_list,
        langfuse_session_id=f"chat-history-{chat_name}-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
    )

    if result:
        return JSONResponse(
            status_code=200,
            content={"status": "success", "result": result}
        )
    else:
        return JSONResponse(status_code=500, content={"status": "error"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)