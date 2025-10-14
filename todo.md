1. quality_score, next_post_time, hook_type, engagement_score are always null in tweets table. They are redundant\
2. parent_tweet_id is null in threads table (it should have been the id of the first tweet)\
3. source_url is not coming in tweets table for the threads