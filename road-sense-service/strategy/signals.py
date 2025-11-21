from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import PitStrategy, TireStrategy, FuelStrategy

@receiver(post_save, sender=PitStrategy)
def handle_new_pit_strategy(sender, instance, created, **kwargs):
    """
    Signal handler for new pit strategy recommendations
    """
    if created and instance.is_active:
        transaction.on_commit(lambda: _broadcast_strategy_update(instance))

@receiver(post_save, sender=TireStrategy)
def handle_new_tire_strategy(sender, instance, created, **kwargs):
    """
    Signal handler for new tire strategy
    """
    if created:
        transaction.on_commit(lambda: _broadcast_tire_strategy(instance))

@receiver(post_save, sender=FuelStrategy)
def handle_new_fuel_strategy(sender, instance, created, **kwargs):
    """
    Signal handler for new fuel strategy
    """
    if created:
        transaction.on_commit(lambda: _broadcast_fuel_strategy(instance))

def _broadcast_strategy_update(strategy):
    """
    Broadcast strategy update via WebSocket
    """
    try:
        channel_layer = get_channel_layer()
        
        strategy_data = {
            'vehicle_id': strategy.vehicle.vehicle_id,
            'recommended_lap': strategy.recommended_lap,
            'strategy_type': strategy.strategy_type,
            'confidence': strategy.confidence,
            'reasoning': strategy.reasoning,
            'timestamp': strategy.created_at.isoformat()
        }
        
        async_to_sync(channel_layer.group_send)(
            'strategy_updates',
            {
                'type': 'strategy.update',
                'data': strategy_data
            }
        )
        
        print(f"Broadcast strategy update for vehicle {strategy.vehicle.vehicle_id}")
        
    except Exception as e:
        print(f"Error broadcasting strategy update: {e}")

def _broadcast_tire_strategy(strategy):
    """
    Broadcast tire strategy update
    """
    try:
        channel_layer = get_channel_layer()
        
        tire_data = {
            'vehicle_id': strategy.vehicle.vehicle_id,
            'predicted_laps_remaining': strategy.predicted_laps_remaining,
            'degradation_rate': strategy.degradation_rate,
            'optimal_change_lap': strategy.optimal_change_lap,
            'confidence': strategy.confidence,
            'timestamp': strategy.created_at.isoformat()
        }
        
        async_to_sync(channel_layer.group_send)(
            'strategy_updates',
            {
                'type': 'tire_strategy.update',
                'data': tire_data
            }
        )
        
    except Exception as e:
        print(f"Error broadcasting tire strategy: {e}")

def _broadcast_fuel_strategy(strategy):
    """
    Broadcast fuel strategy update
    """
    try:
        channel_layer = get_channel_layer()
        
        fuel_data = {
            'vehicle_id': strategy.vehicle.vehicle_id,
            'current_fuel': strategy.current_fuel,
            'predicted_laps_remaining': strategy.predicted_laps_remaining,
            'consumption_rate': strategy.consumption_rate,
            'need_to_conserve': strategy.need_to_conserve,
            'timestamp': strategy.created_at.isoformat()
        }
        
        async_to_sync(channel_layer.group_send)(
            'strategy_updates',
            {
                'type': 'fuel_strategy.update',
                'data': fuel_data
            }
        )
        
    except Exception as e:
        print(f"Error broadcasting fuel strategy: {e}")