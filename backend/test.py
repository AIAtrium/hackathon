from host import MCPHost, ENABLED_CLIENTS
from dotenv import load_dotenv
import asyncio
from datetime import datetime

load_dotenv()

mcp_host = MCPHost(enabled_clients=ENABLED_CLIENTS)

async def test_chat_history(chat_name: str):
    await mcp_host.initialize_mcp_clients()

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
    """

    client_list = ["Whatsapp"]
    result = await mcp_host.process_input_with_agent_loop(
        input_action=input_action,
        system_prompt=system_prompt,
        client_list=client_list,
        langfuse_session_id=f"chat-history-{chat_name}-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
    )

    print(result)

if __name__ == "__main__":
    asyncio.run(test_chat_history("Summer Trip - SF Crew"))