
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class NotificationConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		if self.scope["user"].is_authenticated:
			self.group_name = f"user_{self.scope['user'].id}"
			await self.channel_layer.group_add(
				self.group_name,
				self.channel_name
			)
			await self.accept()
		else:
			await self.close()

	async def disconnect(self, close_code):
		if hasattr(self, 'group_name'):
			await self.channel_layer.group_discard(
				self.group_name,
				self.channel_name
			)

	async def receive(self, text_data):
		pass

	async def send_notification(self, event):
		await self.send(text_data=json.dumps(event["notification"]))

	async def notification_message(self, event):
		"""Обработчик для отправки уведомлений"""
		await self.send(text_data=json.dumps({
			'type': 'notification',
			'message': event['message'],
			'notification_id': event.get('notification_id'),
			'created_at': event.get('created_at'),
			'notification_type': event.get('notification_type', 'general')
		}))
