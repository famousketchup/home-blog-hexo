---
title: My first Telegram bot turned out to be terrific
author: Dmitriy Korotayev
author_id: freek
language: ru
tags: [python, telegram, dev]
categories: [projects]
date: 2024-01-14 05:39:00
---

## My first Telegram bot, yay

> An essay with tutorial aftertaste

**Telegram**, a popular chat app, is secure and easy to use. Telegram's Bot
API lets developers build interactive bots for everything from
information retrieval to automation. This tutorial demonstrates how to
build a Telegram bot using Python and the `telebot` module. After
following this guide, you will find out how easy it was to build
something useful regarding usecase of my bot

### Needed Before

It's important to know the basics of Python programming before starting
to build a Telegram bot. It will be easier to learn if you already know
about things like variables, functions, and control flow.

## Why I decided to automate administering a Telegram channel

Scheduling channel postings is too laborious and cumbersome, so I've
always put off making a Telegram bot that simply queues posts (my images
with meme captions). It turns out, though, that all it takes is two days
(or six to eight hours altogether) and the use of `pyTelegramBotAPI`
documentation, along with a few other Python modules: `schedule`,
`datetime,` and `ThreadPoolExecutor` from `concurrent.futures` to
accomplish the job. But I`ll spare you the tedious stack explanation.

## Modules used and @BotFather itself

- `@BotFather` telegram bot, through which you create a bot, set it's
  image, get `TOKEN` to be used in an app and define many other bot's
  features

- `import pyTelegramBotAPI`: gives you a way to talk to the Telegram Bot API in Python.
- `import schedule`: This is used to plan when to do things.
- `import datetime`: This module lets you work with dates and times in Python.
- `from concurrent.futures import ThreadPoolExecutor`: Allows multiple
  jobs to be run at the same time.

## Preamble

- `TOKEN`: Telegram bot token string
- `channel_id`: Channel to auto-post images to
- `target_time`: When to post images from queue (`time(xx, xx)`)
- `os.environ['PYTHONBREAKPOINT'] = 'ipdb.set_trace'`: My favorite
  debugger

```python
bot = telebot.TeleBot(TOKEN, parse_mode=None)
db = TinyDB('schedule.json')
```

{% collapsecard "Show source" 'Hide source" %}

```python
# Telegram bot token
TOKEN = "[get from @BotFather]"
# Channel to auto-post images to
channel_id = '@memetimes' # Shameless self-promotion
# When to post images from queue
target_time = time(18, 20)
# Debugger set to ipdb
os.environ['PYTHONBREAKPOINT'] = 'ipdb.set_trace'

bot = telebot.TeleBot(TOKEN, parse_mode=None)
db = TinyDB('schedule.json')
```

{% endcollapsecard %}

## Just a few functions

- Handles messages you send to the bot (meme images with captions in my case):

```python
@bot.message_handler(content_types=['photo'])
def queue_image(message):
```

A function is responsible for saving the `file_id` and caption of a
photo to the database, together with the `scheduled_for` date and
the `posted` status of the post set to `0`. Pretty easy to understand,
true? Additionally, it replies you with the date when the post is
scheduled to be sent.

{% collapsecard "Show source" 'Hide source" %}

```python
# Queue posts handler
@bot.message_handler(content_types=['photo'])
def queue_image(message):
    """Handle posts received by a bot and add them to a database."""
    # Get the file ID of the largest photo (assuming it's the original)
    # For reference when it will be posted as per schedule
    photo_id = message.photo[-1].file_id

    # Posts count in queue which are already scheduled
    queue_length = db.count(where('posted') == 0)

    now = datetime.now()

    # Calculate date to post a queue item
    today = now.date()
    date_to_post = today + timedelta(days=queue_length)
    # except if time has already passed, then tomorrow, with empty queue
    if queue_length == 0 and now.time() > time(18, 20):
        date_to_post += timedelta(days=1)

    # Save all the necessary data for a queued post
    data = {
        'photo_id': photo_id,
        'channel_id': channel_id,
        'caption': message.caption,
        'scheduled_for': date_to_post.isoformat(),
        'added': now,
        'posted': 0
    }
    json_data = json.dumps(data, default=lambda obj: obj.isoformat()
                           if isinstance(obj, datetime) else None)
    db.insert(json.loads(json_data))

    # Reply about scheduled post
    scheduled_for = f'This post is scheduled for {date_to_post.isoformat()}'
    bot.reply_to(message, scheduled_for)
```

{% endcollapsecard %}

- At a predetermined time, posts an image together with a caption from a
  queue that is stored in a database:

```python
def do_a_post(not_todays_post=False):
```

- Checks the queue database to see if there are any posts.
- Gets the scheduled post (today or the first database item if the
  `not_todays_post` function argument is set to `True`).
- Sends an image post along with a caption
- Changes status to posted

{% collapsecard "Show source" 'Hide source" %}

```python
def do_a_post(not_todays_post=False):
"""Post image with caption from queue stored in a database.""" # Check if there are any posts in queue db
if len(db.all()) == 0:
print('No posts are scheduled')
return False

    # Get scheduled post (today or otherwise first)
    if not_todays_post:
        chosen_post = db.all()[0]
    else:
        is_not_posted = where('posted') == 0
        is_for_today = where('scheduled_for') == date.today().isoformat()
        chosen_post = db.search((is_not_posted) & (is_for_today))
        if (len(chosen_post) == 0):
            print('No posts for today')
            return False
        else:
            chosen_post = chosen_post[0]

    # Send out the image post with a caption
    photo_id = chosen_post['photo_id']
    caption = chosen_post['caption']
    bot.send_photo(channel_id, photo_id, caption=caption)

    # Change status to posted
    post_query = where('photo_id') == photo_id
    update_value = {'posted': 1}
    db.update(update_value, post_query)
    print(f'Post with caption {caption} posted')
```

{% endcollapsecard %}

## Finally, scheduler and bot initialization (in parallel)

- Schedules a `do_a_post` function to be run at specified time
- Runs scheduler and telegram bot in parallel with the help of
  `ThreadPoolExecutor`

{% collapsecard "Show source" 'Hide source" %}

```python
# Schedule to post at a specific time
scheduled_time = f'{target_time.hour}:{target_time.minute}'
schedule.every().day.at(scheduled_time).do(do_a_post)

# Keep scheduled jobs running
def parallel_scheduler_function():
    print('Starting post scheduler')
    while True:
        schedule.run_pending()
        time_sleep.sleep(1)

# Start bot to work without stop
with ThreadPoolExecutor() as executor:
    # Submit the parallel function to the thread pool
    future = executor.submit(parallel_scheduler_function)

    # Start the bot's long polling loop
    print('Starting bot')
    bot.infinity_polling()
```

{% endcollapsecard %}

## Final words from yours truly

Congratulations to me!  
I've successfully built a Telegram bot in Python for the first time,
and how exciting this short journey was~\*.  
In this guide, I covered the entire process of coding my kind of bot to
help any manual labor, required by Telegram channel moderators and
admins alike.  
By following the steps outlined in this guide, you now have the
foundation to automate one kind of moderation workflow.

Remember, building a Telegram bot is not only a technical endeavor but
also an opportunity to unleash your creativity and provide value to your
audience. Happy coding!

### **P.S.** GitHub with a source code will be available very soon
